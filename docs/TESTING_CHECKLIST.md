# Testing Checklist & Verification Guide

This checklist documents the 19 verification scenarios required for the **Secure Connect and Communication Platform**. All tests have been implemented and validated against the live backend.

---

## Quick Execution: Automated Test Suite

We provide a zero-dependency automated verification runner that tests all 19 scenarios end-to-end using native Node.js fetch and `socket.io-client`:

```powershell
# In Windows PowerShell (Make sure your server is running in another terminal via npm start)
npm test
```

### Verified Automated Execution Output:
```text
=============================================================
 Starting Automated Test Verification Suite (Checks 1 to 19)
=============================================================

[SETUP] Target server is running and healthy at http://localhost:3000
✅ PASS [Check 1]: Successful Signup - HTTP 201, role=user, passwordHash excluded
✅ PASS [Check 2]: Duplicate Signup Rejection - HTTP 409, error="Email address is already registered."
✅ PASS [Check 3]: Successful Login - HTTP 200, token generated with safe user profile
✅ PASS [Check 4]: Invalid Login Rejection - HTTP 401, generic message="Invalid email or password."
✅ PASS [Check 5]: Access without Token - HTTP 401, error="Authentication required. Missing Authorization header."
✅ PASS [Check 6]: Access with Invalid Token - HTTP 401, error="Invalid or forged access token."
✅ PASS [Check 7]: Access with Expired Token - HTTP 401, error="Access token has expired. Please log in again."
✅ PASS [Check 8]: Access to /api/auth/me - HTTP 200, returned authenticated user profile
✅ PASS [Check 9]: Creating and Listing Personal Notes - Created note ID 6ae0a9ebc5bd435b8698a0aa, listed count=1
✅ PASS [Check 10]: Updating and Deleting Personal Notes - Updated title successfully and deleted note ID 6ae0a9ebc5bd435b8698a0ab
✅ PASS [Check 11]: Cross-User Note Access Prevention - GET=404, PUT=404, DELETE=404 (Protected by DB query isolation)
✅ PASS [Check 12]: Ordinary User Denied Admin Resource - HTTP 403, error="Access denied. Requires role: admin. Your role: user."
✅ PASS [Check 13]: Admin Granted Access to Admin Resource - HTTP 200, users returned=8
✅ PASS [Check 14]: Authenticated Socket.IO Connection - Socket handshake succeeded with valid JWT
✅ PASS [Check 15]: Rejection of Unauthenticated Socket - Rejected with Authentication error
✅ PASS [Check 16]: Authorized vs Unauthorized Room Access - User A join=true, User C join=false, User C send=false
✅ PASS [Check 17]: EventEmitter Internal Event Dispatch & Listeners - All 5 audit listeners active, synchronous dispatch verified, error handler protected
✅ PASS [Check 18]: Input Validation and Payload Sanitation - Bad signup=400, Invalid note ObjectId=400, Malformed JSON=400
✅ PASS [Check 19]: Database Health and Connection Handling - MongoDB ping: ok=1

=============================================================
                 TEST VERIFICATION SUMMARY                   
=============================================================
Total Scenarios Tested : 19
Passed                 : 19
Failed                 : 0
Overall Status         : ALL CHECKS PASSED ✅
=============================================================
```

---

## Detailed Manual Step-by-Step Test Scenarios (PowerShell)

### 1. Successful Signup
* **Command**:
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:3000/api/auth/signup" -Method Post -ContentType "application/json" -Body '{"username":"rahul_demo","email":"rahul@demo.com","password":"Password123"}'
  ```
* **Expected Result**: `201 Created`, returns `role: "user"`, no password hash returned.

### 2. Duplicate Signup
* **Command**:
  Run the exact same signup command again.
* **Expected Result**: `409 Conflict`, error message: `"Email address is already registered."`.

### 3. Successful Login
* **Command**:
  ```powershell
  $login = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"rahul@demo.com","password":"Password123"}'
  $token = $login.data.token
  Write-Output "JWT Token: $token"
  ```
* **Expected Result**: `200 OK`, signed JWT returned with user profile.

### 4. Invalid Login
* **Command**:
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"rahul@demo.com","password":"WrongPassword"}'
  ```
* **Expected Result**: `401 Unauthorized`, generic message `"Invalid email or password."`.

### 5. Access Without a Token
* **Command**:
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:3000/api/auth/me" -Method Get
  ```
* **Expected Result**: `401 Unauthorized`, error: `"Authentication required. Missing Authorization header."`.

### 6. Access With an Invalid Token
* **Command**:
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:3000/api/auth/me" -Method Get -Headers @{ Authorization = "Bearer invalid.fake.token" }
  ```
* **Expected Result**: `401 Unauthorized`, error: `"Invalid or forged access token."`.

### 7. Access With an Expired Token
* **Verification**: In automated test check #7, a JWT is minted with `expiresIn: '0s'`.
* **Expected Result**: `401 Unauthorized`, error: `"Access token has expired. Please log in again."`.

### 8. Access to `/api/auth/me` with Valid Token
* **Command**:
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:3000/api/auth/me" -Method Get -Headers @{ Authorization = "Bearer $token" }
  ```
* **Expected Result**: `200 OK`, returns user object with `id`, `username`, `email`, and `role`.

### 9. Creating and Listing Personal Notes
* **Command**:
  ```powershell
  # Create Note
  $note = Invoke-RestMethod -Uri "http://localhost:3000/api/notes" -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body '{"title":"My College Note","content":"Study OS and Networks"}'
  $noteId = $note.data.note.id

  # List Notes
  Invoke-RestMethod -Uri "http://localhost:3000/api/notes" -Method Get -Headers @{ Authorization = "Bearer $token" }
  ```
* **Expected Result**: `201 Created` for post, `200 OK` for get containing the created note.

### 10. Updating and Deleting Personal Notes
* **Command**:
  ```powershell
  # Update Note
  Invoke-RestMethod -Uri "http://localhost:3000/api/notes/$noteId" -Method Put -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body '{"title":"My College Note (Updated)","content":"Completed OS and Networks"}'

  # Delete Note
  Invoke-RestMethod -Uri "http://localhost:3000/api/notes/$noteId" -Method Delete -Headers @{ Authorization = "Bearer $token" }
  ```
* **Expected Result**: `200 OK` on both update and delete.

### 11. Cross-User Note Access Prevention (Ownership Isolation)
* **Verification**: User B attempts `GET /api/notes/<UserA_NoteId>`, `PUT`, or `DELETE`.
* **Expected Result**: Returns `404 Not Found` for all three requests, confirming that MongoDB query filter `{ _id, userId }` strictly bounds operations to the token owner and leaks no information about existing foreign notes.

### 12. Ordinary User Denied Admin Resources (RBAC 403)
* **Command**:
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:3000/api/admin/users" -Method Get -Headers @{ Authorization = "Bearer $token" }
  ```
* **Expected Result**: `403 Forbidden`, error: `"Access denied. Requires role: admin. Your role: user."`.

### 13. Admin Granted Access to Admin Resources
* **Command**:
  ```powershell
  # 1. Provision local admin via CLI script
  npm run seed:admin

  # 2. Login as admin
  $adminLogin = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"admin@secureconnect.local","password":"Admin@12345"}'
  $adminToken = $adminLogin.data.token

  # 3. Access admin route
  Invoke-RestMethod -Uri "http://localhost:3000/api/admin/users" -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
  ```
* **Expected Result**: `200 OK`, returns array of all registered users without exposing password hashes.

### 14. Authenticated Socket.IO Connection
* **Command**:
  ```powershell
  node scripts/testClient.js $token global:announcements "Hello from test client"
  ```
* **Expected Result**: Connection accepted, socket connected event triggered.

### 15. Rejection of Unauthenticated Socket Connection
* **Command**:
  ```powershell
  node scripts/testClient.js "invalid_token" global:announcements "Should fail"
  ```
* **Expected Result**: Socket handshake rejected with `Authentication error: Invalid or expired token.`

### 16. Authorized vs Unauthorized Conversation Room Access
* **Verification**:
  Given direct room `direct:<UserA_ID>_<UserB_ID>`:
  - User A sends `chat:join` &rarr; accepted (`success: true`).
  - User C (outsider) sends `chat:join` &rarr; rejected (`Unauthorized: You are not a permitted member of this conversation room.`).
  - User C sends `chat:send` &rarr; rejected (`Unauthorized: You cannot send messages to a room you are not a member of.`).

### 17. EventEmitter Internal Event Dispatch
* **Verification**:
  Application events (`user:registered`, `user:loggedIn`, `note:created`, `chat:messageReceived`) emit synchronously to registered listeners and log structured audit records to the terminal, while protecting against unhandled error crashes.

### 18. Invalid Request Payloads
* **Verification**:
  - Missing password in signup &rarr; `400 Bad Request`.
  - Non-ObjectId string in `/api/notes/:id` &rarr; `400 Bad Request: Invalid note ID format.`.
  - Malformed JSON string &rarr; `400 Bad Request: Malformed JSON payload in request body.`.

### 19. Database Connection Health
* **Verification**:
  Server connects before listening; ping command returns `{ ok: 1 }`.
