# Secure Connect and Communication Platform: API Reference Guide

This document details all REST API endpoints, Socket.IO real-time events, authentication rules, role requirements, request/response structures, and error states.

---

## 1. Global Specifications

### Base URL
`http://localhost:3000`

### Common Request Headers
* **Content-Type**: `application/json` (Required for all `POST` and `PUT` endpoints).
* **Authorization**: `Bearer <JWT_TOKEN>` (Required for all protected endpoints).

### Standard Response Envelope
All API endpoints return a predictable JSON envelope:

#### Successful Response
```json
{
  "success": true,
  "message": "Optional human-readable confirmation",
  "data": { ... }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Specific explanation of the failure"
  }
}
```

---

## 2. Authentication & User Endpoints (`/api/auth`)

### 2.1 Public User Registration
Creates a new account. Every public registration is strictly assigned the `"user"` role.

* **URL**: `/api/auth/signup`
* **Method**: `POST`
* **Authentication**: None (Public)
* **Role Required**: None

#### Request Body
| Field | Type | Required | Constraints |
| :--- | :--- | :--- | :--- |
| `username` | String | Yes | 3 to 30 characters, letters, numbers, and underscores only (`^[a-zA-Z0-9_]{3,30}$`). |
| `email` | String | Yes | Valid email address, max 100 characters. |
| `password` | String | Yes | Minimum 8 characters, maximum 128 characters. |

```json
{
  "username": "rohit_sharma",
  "email": "rohit@example.com",
  "password": "SecurePassword123"
}
```

#### Responses
* **201 Created**: Account successfully registered.
  ```json
  {
    "success": true,
    "message": "Account created successfully.",
    "data": {
      "user": {
        "id": "6ae0a9e5c5bd435b8698a0a7",
        "username": "rohit_sharma",
        "email": "rohit@example.com",
        "role": "user",
        "createdAt": "2026-10-27T13:40:53.285Z"
      }
    }
  }
  ```
* **400 Bad Request**: Missing or malformed input.
  ```json
  {
    "success": false,
    "error": { "message": "Password is required and must be at least 8 characters long." }
  }
  ```
* **409 Conflict**: Duplicate email or username.
  ```json
  {
    "success": false,
    "error": { "message": "Email address is already registered." }
  }
  ```

---

### 2.2 User Login
Authenticates an existing user, verifies password hash with `bcrypt`, and issues a signed JSON Web Token (JWT).

* **URL**: `/api/auth/login`
* **Method**: `POST`
* **Authentication**: None (Public)
* **Role Required**: None

#### Request Body
```json
{
  "email": "rohit@example.com",
  "password": "SecurePassword123"
}
```

#### Responses
* **200 OK**: Login successful, returns token and safe profile.
  ```json
  {
    "success": true,
    "message": "Login successful.",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "6ae0a9e5c5bd435b8698a0a7",
        "username": "rohit_sharma",
        "email": "rohit@example.com",
        "role": "user",
        "createdAt": "2026-10-27T13:40:53.285Z"
      }
    }
  }
  ```
* **401 Unauthorized**: Invalid email or password.
  ```json
  {
    "success": false,
    "error": { "message": "Invalid email or password." }
  }
  ```

---

### 2.3 Authenticated User Profile
Retrieves the safe profile of the currently logged-in user.

* **URL**: `/api/auth/me`
* **Method**: `GET`
* **Authentication**: Bearer JWT
* **Role Required**: Any authenticated user (`user` or `admin`)

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

#### Responses
* **200 OK**: Returns user profile.
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "6ae0a9e5c5bd435b8698a0a7",
        "username": "rohit_sharma",
        "email": "rohit@example.com",
        "role": "user",
        "createdAt": "2026-10-27T13:40:53.285Z"
      }
    }
  }
  ```
* **401 Unauthorized**: Missing, expired, or invalid token.
  ```json
  {
    "success": false,
    "error": { "message": "Access token has expired. Please log in again." }
  }
  ```

---

## 3. Secure Notes Endpoints (`/api/notes`)

All Note endpoints enforce database-level query isolation (`userId: req.user.userId`).

### 3.1 Create Note
* **URL**: `/api/notes`
* **Method**: `POST`
* **Authentication**: Bearer JWT
* **Role Required**: Authenticated user

#### Request Body
```json
{
  "title": "Semester Project Deliverables",
  "content": "Finalize backend documentation and viva practice questions."
}
```

#### Responses
* **201 Created**: Note created.
  ```json
  {
    "success": true,
    "message": "Note created successfully.",
    "data": {
      "note": {
        "id": "6ae0a9ebc5bd435b8698a0aa",
        "userId": "6ae0a9e5c5bd435b8698a0a7",
        "title": "Semester Project Deliverables",
        "content": "Finalize backend documentation and viva practice questions.",
        "createdAt": "2026-10-27T13:40:59.273Z",
        "updatedAt": "2026-10-27T13:40:59.273Z"
      }
    }
  }
  ```
* **400 Bad Request**: Missing title or content.

---

### 3.2 List Personal Notes
Returns only the notes owned by the caller.

* **URL**: `/api/notes`
* **Method**: `GET`
* **Authentication**: Bearer JWT

#### Responses
* **200 OK**:
  ```json
  {
    "success": true,
    "data": {
      "count": 1,
      "notes": [
        {
          "id": "6ae0a9ebc5bd435b8698a0aa",
          "userId": "6ae0a9e5c5bd435b8698a0a7",
          "title": "Semester Project Deliverables",
          "content": "Finalize backend documentation and viva practice questions.",
          "createdAt": "2026-10-27T13:40:59.273Z",
          "updatedAt": "2026-10-27T13:40:59.273Z"
        }
      ]
    }
  }
  ```

---

### 3.3 Get Single Note by ID
* **URL**: `/api/notes/:id`
* **Method**: `GET`
* **Authentication**: Bearer JWT

#### Responses
* **200 OK**: Note found and returned.
* **400 Bad Request**: Invalid MongoDB ObjectId format.
* **404 Not Found**: Note does not exist, OR belongs to another user (prevents cross-user ID enumeration).

---

### 3.4 Update Note
* **URL**: `/api/notes/:id`
* **Method**: `PUT`
* **Authentication**: Bearer JWT

#### Request Body
```json
{
  "title": "Semester Project Deliverables (Updated)",
  "content": "Added automated checklist testing."
}
```

#### Responses
* **200 OK**: Note updated.
* **404 Not Found**: Note does not exist or caller does not own the note.

---

### 3.5 Delete Note
* **URL**: `/api/notes/:id`
* **Method**: `DELETE`
* **Authentication**: Bearer JWT

#### Responses
* **200 OK**: Note deleted successfully.
  ```json
  {
    "success": true,
    "message": "Note deleted successfully."
  }
  ```
* **404 Not Found**: Note does not exist or caller does not own the note.

---

## 4. Administration Endpoints (`/api/admin`)

### 4.1 List All Users (RBAC Protected)
* **URL**: `/api/admin/users`
* **Method**: `GET`
* **Authentication**: Bearer JWT
* **Role Required**: `admin`

#### Responses
* **200 OK**: Admin authorized, list of users returned.
  ```json
  {
    "success": true,
    "data": {
      "count": 2,
      "users": [
        {
          "id": "6ae0aa5ef9597a3df1caedb3",
          "username": "admin_root",
          "email": "admin@secureconnect.local",
          "role": "admin",
          "createdAt": "2026-10-27T13:45:10.000Z"
        },
        {
          "id": "6ae0a9e5c5bd435b8698a0a7",
          "username": "rohit_sharma",
          "email": "rohit@example.com",
          "role": "user",
          "createdAt": "2026-10-27T13:40:53.285Z"
        }
      ]
    }
  }
  ```
* **403 Forbidden**: Caller possesses a valid token, but role is `user` instead of `admin`.
  ```json
  {
    "success": false,
    "error": {
      "message": "Access denied. Requires role: admin. Your role: user."
    }
  }
  ```

---

## 5. Socket.IO Real-Time Chat Specifications

Socket.IO operates on the same HTTP server (`ws://localhost:3000`).

### 5.1 Connection Authentication
Authentication occurs during the initial connection handshake.

* **Client Option**:
  ```js
  const socket = io('http://localhost:3000', {
    auth: { token: '<JWT_TOKEN>' }
  });
  ```
* **Failure State**: If token is missing, expired, or invalid, connection is rejected with `connect_error: Authentication error: ...`.

### 5.2 Room Structure and Authorization
Direct conversations between two users follow the deterministic format:
`direct:<userIdA>_<userIdB>` (where user IDs are sorted lexicographically).

* **Authorization Rule**: The server inspects the room string. If the connected user's ID is NOT part of the room name, the request is rejected with `chat:error`.

### 5.3 Events Reference

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `chat:join` | Client &rarr; Server | `{ conversationId: "direct:id1_id2" }` | Requests joining conversation room and fetches previous 50 messages. |
| `chat:joined` | Server &rarr; Client | `{ success: true, conversationId, history: [...] }` | Confirmation of room membership with message history. |
| `chat:send` | Client &rarr; Server | `{ conversationId: "...", message: "Text" }` | Sends a message to the room. Sender identity is injected securely from JWT. |
| `chat:message` | Server &rarr; Client (Room broadcast) | `{ id, conversationId, senderId, senderUsername, message, timestamp }` | Dispatched in real time to all room members upon arrival. |
| `chat:error` | Server &rarr; Client | `{ success: false, error: "Explanation" }` | Dispatched if an unauthorized room access, empty message, or invalid payload occurs. |
