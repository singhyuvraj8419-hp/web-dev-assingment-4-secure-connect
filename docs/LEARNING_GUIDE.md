# Complete Learning Guide: Secure Connect and Communication Platform

> **Welcome!** Yeh guide specifically ek beginner ke liye design ki gayi hai. Agar aapko backend development, security concepts, ya practical viva me explain karne me thodi bhi hesitation hoti hai, toh yeh guide aapke saare doubts clear karegi. 
> 
> Hum simple **Hinglish** (Hindi + English) me baat karenge, jisme technical terms (jaise middleware, controller, hashing, JWT, handshake) English me hi rahenge taaki viva me teacher ke saamne aap perfectly bol sakein.

---

## Table of Contents
1. **System Architecture & Request Flow** (Request kaise travel karti hai)
2. **Node.js & Express.js ka Role** (Runtime vs Framework)
3. **Layered Architecture: Route vs Controller vs Middleware vs Model**
4. **Project File Directory Map** (Kaunsi file kyu banayi gayi)
5. **Feature 1: User Signup & Bcrypt Password Hashing**
6. **Feature 2: User Login & JWT Token Generation**
7. **Feature 3: Custom JWT Authentication Middleware (Line-by-Line)**
8. **Feature 4: Authentication vs Authorization & RBAC**
9. **Feature 5: Secure Notes API & Query-Level Ownership Enforcement**
10. **Feature 6: Real-Time Chat using Socket.IO & Handshake Auth**
11. **Feature 7: Node.js EventEmitter vs Socket.IO**
12. **Environment Configuration (`.env`) & Startup Validation**
13. **Centralized Error Handling & HTTP Status Codes**
14. **Security Checklist: Common Vulnerabilities & Our Defenses**
15. **Troubleshooting & Common Runtime Errors**
16. **College Viva Preparation: 22 Top Questions & Precise Answers**

---

## 1. System Architecture & Request Flow

Jab koi client (browser, mobile app, ya Postman) humare server par request bhejta hai, toh request kis raste se guzarti hai? 

```
[ Client Request ] 
       │
       ▼
[ server.js ]  ── (HTTP Headers, CORS, JSON Parser, Body Limit 100kb)
       │
       ▼
[ Routes (authRoutes, noteRoutes, adminRoutes) ] ── (URL endpoint matching)
       │
       ▼
[ Middleware Pipeline ]
   ├── 1. validateInput (Kya fields empty toh nahi? Formats sahi hain?)
   ├── 2. authenticateToken (Kya valid Bearer JWT present hai?)
   └── 3. authorizeRole (Kya user ka role 'admin' hai?)
       │
       ▼
[ Controllers (authController, noteController) ] ── (Business Logic Execution)
       │
       ▼
[ Models / Database Layer (MongoDB) ] ── (Queries with Query-Level Isolation)
       │
       ▼
[ Internal EventEmitter ] ── (Process-Level Audit Logging)
       │
       ▼
[ JSON Response ] ── (Strictly formatted envelope: success, data / error)
```

### Flow ki Khasiyat:
1. **Early Return**: Agar request me data galat hai ya token missing hai, toh request controller ya database tak jaati hi nahi hai. Middleware use pehle hi `400` ya `401` dekar terminate kar deta hai.
2. **Defensive Isolation**: Controller direct raw client input par trust nahi karta; `req.user` strictly token se inject hota hai.

---

## 2. Node.js & Express.js ka Role

### Node.js Kya Hai?
* **Concept**: Node.js koi programming language nahi hai. Yeh ek **JavaScript Runtime Environment** hai jo Google Chrome ke V8 engine par bana hai.
* **Why use it**: Normal JavaScript sirf browser me chalti thi. Node.js hume computer ke operating system par JS run karne, file read/write karne, network requests handle karne aur database se connect karne ki power deta hai.
* **Single-Threaded Event Loop**: Node.js asynchronous non-blocking I/O use karta hai. Iska matlab jab database query run hoti hai, server doosri incoming requests handle karta rehta hai bina freeze hue.

### Express.js Kya Hai?
* **Concept**: Express.js ek minimal aur flexible web framework hai jo Node.js ke upar chalta hai.
* **Why use it**: Node.js ke built-in `http` module se routes banana (`req.url === '/api/login' && req.method === 'POST'`) bohot tedious aur error-prone hota hai. Express hume clean routing, middleware chaining, aur request/response parsing provide karta hai.

---

## 3. Routes vs Controllers vs Middleware vs Models

Beginners aksar saara code ek hi file me daal dete hain (jaise direct `server.js` me database query likhna). Humne is project me **Separation of Concerns (SoC)** follow kiya hai:

| Layer | Folder | Responsibility | Real Example |
| :--- | :--- | :--- | :--- |
| **Routes** | `src/routes/` | Sirf HTTP method aur URL path match karna, aur sahi middlewares aur controller ko wire karna. | `router.post('/signup', validateSignup, authController.signup);` |
| **Middleware**| `src/middleware/` | Request aur Response ke beech me checks perform karna (validation, JWT check, role check, error handling). | `authenticateToken` jo token verify karke `req.user` set karta hai. |
| **Controllers** | `src/controllers/`| Core business logic. Hashing karna, token issue karna, decision lena ki kya response dena hai. | `signup()`, `login()`, `createNote()` functions. |
| **Models** | `src/models/` | Direct database queries execute karna. MongoDB collections se data insert ya fetch karna. | `noteModel.createNote({ userId, title, content })`. |
| **Config** | `src/config/` | Environment variables load karna aur MongoDB client ka singleton connection maintain karna. | `connectDB()`, `getDB()`. |

---

## 4. Project File Directory Map

Aapke project me har file ka specific purpose hai. Teacher ko demonstrate karte waqt aap confidently bata sakte hain:

```
secure-connect-platform/
├── server.js                      # Main entrypoint: HTTP server, Express app, Socket.IO, Graceful shutdown
├── package.json                   # Dependencies aur npm scripts (start, dev, test, seed:admin)
├── .env                           # Local secret variables (Never committed to Git)
├── .env.example                   # Documentation template for environment variables
├── .gitignore                     # Git ko batata hai ki node_modules aur .env ignore karo
├── README.md                      # Complete installation and usage manual
├── src/
│   ├── config/
│   │   ├── env.js                 # Environment validation (exits if JWT_SECRET missing)
│   │   └── database.js            # MongoDB official driver connection singleton & index creation
│   ├── models/
│   │   ├── userModel.js           # User collection queries, toSafeUser serializer
│   │   ├── noteModel.js           # Notes CRUD queries with database-level userId filter
│   │   └── messageModel.js        # Chat messages persistence and conversation history
│   ├── controllers/
│   │   ├── authController.js      # Signup, Login, Me logic
│   │   ├── noteController.js      # Note create, read, update, delete logic
│   │   └── adminController.js     # Admin-only user listing logic
│   ├── routes/
│   │   ├── authRoutes.js          # /api/auth routes
│   │   ├── noteRoutes.js          # /api/notes routes (all protected by authenticateToken)
│   │   └── adminRoutes.js         # /api/admin routes (protected by token + admin role)
│   ├── middleware/
│   │   ├── authenticateToken.js   # Custom Bearer JWT verification middleware
│   │   ├── authorizeRole.js       # Reusable RBAC role authorization middleware
│   │   ├── errorHandler.js        # Centralized 404 & error responder
│   │   └── validateInput.js       # Request payload sanitizer and validator
│   ├── sockets/
│   │   └── chatSocket.js          # Socket.IO handshake auth, room membership verification, messaging
│   ├── events/
│   │   └── appEvents.js           # Node.js built-in EventEmitter for structured audit logging
│   └── utils/
│       └── tokenUtils.js          # JWT sign & verify helpers
├── scripts/
│   ├── createAdmin.js             # Safe local CLI tool to provision initial administrator
│   ├── testClient.js              # Node.js Socket.IO testing client
│   └── runChecks.js               # Complete 19-scenario automated test runner
└── docs/
    ├── API_GUIDE.md               # API endpoints, request/response formats
    ├── LEARNING_GUIDE.md          # This complete teaching and viva guide
    └── TESTING_CHECKLIST.md       # 19 test scenarios checklist with exact commands
```

---

## 5. Feature 1: User Signup & Bcrypt Password Hashing

### 1. What we wanted to implement:
User registration endpoint (`POST /api/auth/signup`) jo naye users ko register kare, email/username duplicates reject kare, password ko securely hash kare, public role ko strictly `"user"` banaye, aur safe response de.

### 2. Files involved:
* `src/middleware/validateInput.js`
* `src/controllers/authController.js`
* `src/models/userModel.js`

### 3. The Core Code:
```javascript
// src/controllers/authController.js (signup)
const existingEmail = await userModel.findByEmail(email);
if (existingEmail) {
  return res.status(409).json({
    success: false,
    error: { message: 'Email address is already registered.' },
  });
}

// Password hashing with bcrypt
const passwordHash = await bcrypt.hash(password, config.BCRYPT_SALT_ROUNDS);

// Public signup CANNOT assign admin privileges!
const createdUser = await userModel.createUser({
  username,
  email,
  passwordHash,
  role: 'user', // Hardcoded safe default role
});

const safeUser = userModel.toSafeUser(createdUser);
```

### 4. Code ka Step-by-Step matlab:
1. **Input Validation**: `validateSignup` middleware ensure karta hai ki `username` 3-30 alphanumeric characters ka ho, `email` valid format ho, aur `password` at least 8 characters ka ho.
2. **Duplicate Check**: Database me query karke dekha jata hai ki email ya username pehle se exist toh nahi karta. Agar karta hai, toh `409 Conflict` return hota hai.
3. **Bcrypt Hashing**: `bcrypt.hash(password, 12)` password ke saath ek unique random **Salt** generate karta hai aur use multiple rounds (2^12 = 4096 iterations) hash karta hai.
4. **Role Enforcement**: Agar client request me `role: "admin"` bhej bhi de, controller use completely ignore karta hai aur hardcoded `role: 'user'` save karta hai.
5. **Safe Serialization**: `userModel.toSafeUser` `passwordHash` ko strip karke sirf `id`, `username`, `email`, `role`, aur `createdAt` return karta hai.

### 5. Why Bcrypt? (Hashing vs Encryption):
* **Encryption (Two-way)**: Data ko encrypt kiya jata hai aur key se decrypt karke original text wapas mil sakta hai.
* **Hashing (One-way)**: Hashing irreversible hoti hai. Hash se original password mathematically calculate nahi kiya ja sakta.
* **Salt kya hota hai?**: Salt ek random string hoti hai jo password ke aage jod di jaati hai hashing se pehle. Isse **Rainbow Table attacks** (precomputed hash tables) fail ho jaate hain. Do users ka same password hone par bhi unka hash alag banta hai.

---

## 6. Feature 2: User Login & JWT Token Generation

### 1. What we wanted to implement:
User login endpoint (`POST /api/auth/login`) jo credentials verify kare, generic error message return kare agar login fail ho, aur success par signed JWT return kare.

### 2. The Core Code:
```javascript
// src/controllers/authController.js (login)
const user = await userModel.findByEmail(email);
if (!user) {
  // Generic error prevents User Enumeration Attack
  return res.status(401).json({
    success: false,
    error: { message: 'Invalid email or password.' },
  });
}

// Compare submitted password with stored bcrypt hash
const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
if (!isPasswordValid) {
  return res.status(401).json({
    success: false,
    error: { message: 'Invalid email or password.' },
  });
}

// Issue signed JWT
const token = generateToken({
  userId: user._id.toString(),
  username: user.username,
  role: user.role,
});
```

### 3. JWT Structure Explained:
JWT ek string hoti hai jisme 3 parts dots (`.`) se separate hote hain:
`Header.Payload.Signature`
1. **Header**: Algortihm type (`HS256`) aur token type (`JWT`).
2. **Payload**: Non-sensitive claims: `{ userId, username, role, exp }`. (Note: Payload base64 encoded hota hai, encrypted nahi. Isme kabhi password ya secret nahi daalna chahiye!).
3. **Signature**: `HMACSHA256(base64UrlEncode(header) + "." + base64UrlEncode(payload), JWT_SECRET)`. Yeh signature prove karti hai ki token server ne banaya hai aur raste me kisi ne payload alter nahi kiya.

---

## 7. Feature 3: Custom JWT Authentication Middleware (Line-by-Line)

Yeh middleware aapke assignment ka sabse critical component hai. Humne koi Passport library use nahi ki hai.

### Full Code with Line-by-Line Explanation:

```javascript
// File: src/middleware/authenticateToken.js
const { verifyToken } = require('../utils/tokenUtils');

function authenticateToken(req, res, next) {
  // Line 1: Incoming request ke headers me se 'authorization' header read karo
  const authHeader = req.headers['authorization'];

  // Line 2: Agar client ne header bheja hi nahi, toh request ko yahi reject karo (401 Unauthorized)
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required. Missing Authorization header.' },
    });
  }

  // Line 3: Header format "Bearer <token>" hona chahiye, use space par split karo
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      success: false,
      error: { message: 'Malformed Authorization header. Format must be "Bearer <token>".' },
    });
  }

  // Line 4: Actual JWT token string extract karo
  const token = parts[1];

  try {
    // Line 5: JWT_SECRET ka use karke signature aur expiry check karo
    const decoded = verifyToken(token);

    // Line 6: Validate karo ki decoded payload me required identity fields present hain
    if (!decoded || !decoded.userId || !decoded.role) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid token payload.' },
      });
    }

    // Line 7: Verified identity ko req.user object par attach karo
    // Security Rule: Client body ya query ke user ID par trust nahi karte, sirf verified token se identity lete hain
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    };

    // Line 8: Request ko next middleware ya controller function ko pass karo
    next();
  } catch (err) {
    // Line 9: Agar token expire ho chuka hai
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Access token has expired. Please log in again.' },
      });
    }

    // Line 10: Agar signature match nahi hua ya token corrupt/tampered hai
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid or forged access token.' },
    });
  }
}

module.exports = authenticateToken;
```

---

## 8. Feature 4: Authentication vs Authorization & RBAC

### The Difference (Viva Question Favorite!):
* **Authentication (Who are you?)**: Yeh verify karta hai ki user wahi hai jo woh claim kar raha hai. (e.g. Email + Password match hua &rarr; Authenticated).
* **Authorization (What are you allowed to do?)**: Yeh verify karta hai ki authenticated user ke paas us specific resource ko access karne ki permission hai ya nahi. (e.g. User logged in hai, lekin kya woh Admin dashboard dekh sakta hai?).

### Reusable RBAC Middleware:
```javascript
// src/middleware/authorizeRole.js
function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    // req.user authenticateToken middleware se aana chahiye
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required before authorization check.' },
      });
    }

    // Role check: allowedRoles array me user ka role check karo
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Requires role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}.`,
        },
      });
    }

    next();
  };
}
```

### Admin Route Protection:
```javascript
// src/routes/adminRoutes.js
router.use(authenticateToken);         // Step 1: Must be authenticated
router.use(authorizeRole('admin'));    // Step 2: Must be an admin

router.get('/users', adminController.getAllUsers);
```

### Safe Local Admin Provisioning:
College assignment me hum public admin signup route nahi bana sakte kyunki koi bhi attacker admin ban sakta hai. Humne ek local CLI script banayi:
```powershell
npm run seed:admin
# or: node scripts/createAdmin.js admin@secureconnect.local Admin@12345 admin_root
```
Yeh script terminal se direct local MongoDB me admin account banati hai. Isme na toh production secret leak hota hai, aur na hi koi insecure public route banta hai.

---

## 9. Feature 5: Secure Notes API & Query-Level Ownership

### The Security Challenge:
Ek multi-user application me agar User A ek note create karta hai, toh User B us note ko read, edit ya delete nahi kar paana chahiye.

### Bad Implementation (Insecure):
```javascript
// INSECURE WAY - DO NOT DO THIS
const note = await db.collection('notes').findOne({ _id: new ObjectId(id) });
if (note.userId !== req.user.userId) { ... }
```
*Problem*: Agar database query sirf ID se hoti hai, toh race conditions ya coding mistakes se unauthorized data leak hone ka risk rehta hai. Aur agar server 403 Forbidden return karta hai, toh attacker ko pata chal jaata hai ki yeh Note ID exist karti hai (Information Disclosure / ID Enumeration).

### Our Implementation: Query-Level Ownership Enforcement
Humne ownership check seedha database query filter ke andar daal diya:

```javascript
// src/models/noteModel.js
async function findNoteByIdAndUser(noteId, userId) {
  if (!ObjectId.isValid(noteId)) return null;

  const db = getDB();
  // Filter me _id AND userId dono ek sath match hone chahiye!
  return db.collection('notes').findOne({
    _id: new ObjectId(noteId),
    userId: userId.toString(),
  });
}

async function updateNoteByIdAndUser(noteId, userId, { title, content }) {
  if (!ObjectId.isValid(noteId)) return null;

  const db = getDB();
  return db.collection('notes').findOneAndUpdate(
    {
      _id: new ObjectId(noteId),
      userId: userId.toString(), // Database level update constraint!
    },
    { $set: { title, content, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
}
```

Agar note exist karta hai lekin doosre user ka hai, toh query `null` return karegi, aur controller `404 Not Found` bhej dega. Isse attacker ko kabhi pata nahi chalega ki kisi doosre user ka yeh note ID exist bhi karta hai ya nahi.

---

## 10. Feature 6: Real-Time Chat using Socket.IO

### HTTP vs WebSockets:
* **HTTP**: Request-Response model. Client request bhejta hai, server respond karta hai, connection close ho jaata hai. Server apni taraf se client ko message nahi bhej sakta.
* **WebSocket / Socket.IO**: Full-duplex persistent connection. Ek baar handshake ho gaya, toh server aur client dono kisi bhi waqt bina delay ke messages bhej sakte hain.

### Socket.IO Handshake Authentication:
Hum connection accept karne se pehle hi JWT token verify karte hain:

```javascript
// src/sockets/chatSocket.js
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error: Missing access token.'));
  }

  try {
    const decoded = verifyToken(token);
    // Verified user identity socket instance par attach kar do
    socket.user = decoded;
    next(); // Connection accepted
  } catch (err) {
    next(new Error('Authentication error: Invalid or expired token.'));
  }
});
```

### Authorized Conversation Rooms Pattern:
Humne ek deterministic direct-message pattern implement kiya hai:
`direct:<userId1>_<userId2>` (where user IDs are sorted).

```javascript
function isUserAuthorizedForConversation(conversationId, userId) {
  if (conversationId.startsWith('direct:')) {
    const members = conversationId.slice(7).split('_');
    // User must be one of the two members!
    return members[0] === userId || members[1] === userId;
  }
  if (conversationId === 'global:announcements') return true;
  return false;
}
```
Jab client `chat:join` ya `chat:send` bhejta hai:
1. Server check karta hai: Kya connected user ka `userId` is room ka member hai?
2. Agar nahi hai, toh turant `chat:error` reject kar deta hai.
3. Message save karte waqt `senderId` client ke payload se nahi liya jaata, balki verified `socket.user.userId` se liya jaata hai. Impersonation impossible hai!

---

## 11. Feature 7: Node.js EventEmitter vs Socket.IO

Yeh viva me teachers ka sabse favourite question hota hai: **"Socket.IO aur EventEmitter dono events par kaam karte hain, toh dono me fark kya hai?"**

| Parameter | Node.js `EventEmitter` | `Socket.IO` |
| :--- | :--- | :--- |
| **Scope** | **Process-Internal** (Single machine / server memory). | **Network Distributed** (Server to remote clients over TCP/WebSockets). |
| **Communication** | Backend modules ke beech (e.g. Controller &rarr; Audit Logger). | Server aur Browser/Mobile phone ke beech. |
| **Execution** | **Synchronous by default**. Listeners registered order me turant execute hote hain. | **Asynchronous / Network dependent**. Packets network par travel karte hain. |
| **Dependency** | Node.js ka built-in module (`require('events')`). Zero external packages. | External library (`socket.io`) using WebSocket protocol. |

### How EventEmitter is used in our project:
Humne `src/events/appEvents.js` banaya hai jo decoupled audit logging karta hai:
```javascript
// Controller me:
appEvents.emit('user:registered', { userId, username, email, role });

// Listener me:
appEvents.on('user:registered', (payload) => {
  // Safe audit log without password
  console.log(`[AUDIT EVENT] [user:registered] userId="${payload.userId}" username="${payload.username}"`);
});
```
Agar listener throw kare toh server crash na ho, isliye humne `appEvents.on('error', ...)` bhi register kiya hai.

---

## 12. Environment Configuration (`.env`) & Startup Validation

### Kyu zaroori hai?
Hardcoding secrets (jaise `const JWT_SECRET = 'mysecret'`) code me karna bohot badi security vulnerability hai. Agar code GitHub par push ho jaye, toh sabhi users ke accounts compromise ho jaate hain.

### Startup Validation (`src/config/env.js`):
Server start hone par pehle hi check karta hai:
1. Kya `JWT_SECRET` present hai aur kam se kam 16+ characters ka hai?
2. Kya `MONGO_URI` configured hai?
Agar missing ho, toh server turant clear error message dekar `process.exit(1)` kar deta hai. Half-configured server kabhi nahi chalega!

---

## 13. Centralized Error Handling & HTTP Status Codes

### Error Handling Architecture:
Har async controller route me `try ... catch (err) { next(err); }` use hota hai. Agar koi bhi error aati hai, Express ka centralized middleware use handle karta hai:

```javascript
// src/middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  // Syntax error handling (e.g. client sent broken JSON)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ success: false, error: { message: 'Malformed JSON payload.' } });
  }

  // MongoDB Duplicate Key Error (Code 11000)
  if (err.code === 11000) {
    return res.status(409).json({ success: false, error: { message: 'Account with that field already exists.' } });
  }

  // Generic 500 error
  res.status(500).json({ success: false, error: { message: 'Internal Server Error' } });
}
```

### HTTP Status Codes Quick Sheet:
* **`200 OK`**: Request successful (e.g., Get notes, Login success).
* **`201 Created`**: New resource successfully created (e.g., Signup, Note created).
* **`400 Bad Request`**: Client input validation failed (e.g., Password < 8 characters, Malformed JSON).
* **`401 Unauthorized`**: Authentication missing, invalid, or expired (e.g., No JWT, Wrong password).
* **`403 Forbidden`**: Authenticated, but lacks required permissions (e.g., Ordinary user accessing Admin route).
* **`404 Not Found`**: Resource does not exist (e.g., Note ID not found or belongs to another user).
* **`409 Conflict`**: Duplicate unique resource (e.g., Email or Username already registered).
* **`500 Internal Server Error`**: Unexpected backend failure.

---

## 14. Top Security Mistakes & How We Fixed Them

| Vulnerability | Bad / Naive Approach | Our Defensive Fix |
| :--- | :--- | :--- |
| **Plaintext Passwords** | Saving passwords as raw text in DB. | Hashing with `bcrypt` + random salt (12 rounds). |
| **Password Hash Exposure** | Returning entire user object in API response. | `toSafeUser()` explicitly strips `passwordHash`. |
| **Privilege Escalation** | Allowing `{ role: "admin" }` in signup body. | Role is hardcoded to `'user'`; Admin created via CLI only. |
| **IDOR (Insecure Direct Object Reference)** | Finding note by `_id` without checking `userId`. | Database query forces `{ _id: noteId, userId: req.user.userId }`. |
| **Sender Impersonation (Chat)** | Trusting `senderId` passed in socket message payload. | Socket identity derived exclusively from verified JWT handshake. |
| **Sensitive Data Logging** | Logging `req.body` or `token` in terminal console. | Audit logger explicitly filters out passwords, hashes, and tokens. |
| **Hardcoded Secrets** | Writing `JWT_SECRET = "12345"` in source code. | Validated environment variables via `.env` with `.gitignore`. |
| **Memory Exhaustion (DoS)** | Unbounded JSON body parsing. | Body size limited to `100kb` (`express.json({ limit: '100kb' })`). |

---

## 15. Troubleshooting & Common Runtime Errors

### 1. `MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017`
* **Kyu hua**: Local MongoDB service running nahi hai.
* **Fix**: Windows PowerShell me check karo: `Get-Service -Name *mongo*`. Agar stopped hai, toh run karo: `Start-Service MongoDB`.

### 2. `FATAL ERROR: JWT_SECRET must be at least 16 characters long`
* **Kyu hua**: `.env` me JWT secret missing hai ya bohot chhota hai.
* **Fix**: Generate secure key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` aur use `.env` me paste karo.

### 3. `Authentication error: Missing access token` in Socket.IO
* **Kyu hua**: Socket client ne handshake me JWT token nahi bheja.
* **Fix**: Socket initialize karte waqt `auth: { token: '<JWT>' }` pass karo.

---

## 16. College Viva Preparation: 22 Top Questions & Precise Answers

### Q1: What is the primary purpose of this project?
**Ans**: It is a secure backend platform that demonstrates robust authentication (bcrypt, JWT), authorization (Role-Based Access Control), resource ownership isolation (Notes CRUD), real-time bi-directional messaging with Socket.IO, and internal audit logging using Node.js EventEmitter.

### Q2: Why did you use the official MongoDB driver instead of Mongoose?
**Ans**: The assignment specified only permitted core libraries. Using the official `mongodb` driver keeps the application lightweight, gives complete transparency over queries and indexes, and demonstrates raw database interactions without relying on heavy ODM abstractions.

### Q3: What is the difference between Hashing and Encryption?
**Ans**: Hashing is one-way and irreversible; you cannot derive the original plaintext password from the hash. Encryption is two-way and reversible using a decryption key. Passwords must always be hashed, never encrypted.

### Q4: Why use Salt rounds in bcrypt?
**Ans**: Salt adds cryptographically random data before hashing, ensuring identical passwords yield completely different hashes. Salt rounds (we use 12) define the computational work factor, slowing down attackers and defeating Rainbow Table attacks.

### Q5: What are the three parts of a JSON Web Token (JWT)?
**Ans**: 
1. **Header**: Specifies the algorithm (`HS256`) and token type (`JWT`).
2. **Payload**: Contains non-sensitive identity claims (`userId`, `username`, `role`, `exp`).
3. **Signature**: Cryptographic hash of `(Header + Payload)` created using our private `JWT_SECRET`.

### Q6: Can a user modify their role by changing the payload of their JWT?
**Ans**: No. If a user modifies any part of the base64-encoded payload, the cryptographic signature check (`jwt.verify`) will fail immediately because the attacker does not know our server's `JWT_SECRET`. The request will be rejected with `401 Unauthorized`.

### Q7: Why should you never store sensitive data like passwords in a JWT payload?
**Ans**: The JWT payload is only Base64Url-encoded, not encrypted. Anyone who inspects the token can easily decode and view the payload claims.

### Q8: What is the difference between Authentication and Authorization?
**Ans**: Authentication confirms **who you are** (validating credentials and issuing identity). Authorization confirms **what you are allowed to do** (verifying if your role or ownership permits accessing a specific resource).

### Q9: How does your Role-Based Access Control (RBAC) middleware work?
**Ans**: Our `authorizeRole('admin')` middleware factory inspects `req.user.role`, which was established by `authenticateToken`. If the role matches, it calls `next()`. If not, it returns `403 Forbidden`.

### Q10: How do you prevent an ordinary user from creating an admin account during signup?
**Ans**: In `authController.signup()`, the user role is hardcoded as `role: 'user'`. Any `role` field sent in the request body is completely ignored. Admin accounts can only be provisioned locally via our CLI script (`npm run seed:admin`).

### Q11: How do you enforce data isolation in the Notes API?
**Ans**: We enforce ownership at the database query level. Every retrieval, update, or deletion query includes both `{ _id: noteId, userId: req.user.userId }`. If an attacker tries to access another user's note, the query returns null, resulting in a safe `404 Not Found`.

### Q12: Why return 404 instead of 403 when a user tries to access another user's note?
**Ans**: Returning `403 Forbidden` confirms to an attacker that the note ID actually exists in the database (Information Disclosure). Returning `404 Not Found` keeps the presence of the resource secret.

### Q13: How does your Socket.IO connection authenticate users?
**Ans**: We use Socket.IO connection middleware (`io.use`). Before establishing the WebSocket session, the server extracts the JWT from `socket.handshake.auth.token`, verifies it using `verifyToken()`, and attaches the verified user identity to `socket.user`. If invalid, the connection is rejected.

### Q14: How do you prevent user impersonation in the chat feature?
**Ans**: When a message is sent via `chat:send`, the server ignores any sender ID in the client payload. Instead, the server takes `senderId` and `senderUsername` directly from the authenticated `socket.user` object.

### Q15: How do you prevent unauthorized users from joining private chat rooms?
**Ans**: Direct messaging rooms follow the deterministic format `direct:<userA>_<userB>`. When `chat:join` or `chat:send` is emitted, the server verifies that `socket.user.userId` matches either `userA` or `userB`. If not, the request is rejected with `chat:error`.

### Q16: What is the difference between Node.js EventEmitter and Socket.IO?
**Ans**: `EventEmitter` is an in-memory, process-internal publish-subscribe mechanism built into Node.js used to communicate between backend modules synchronously. `Socket.IO` is a network-level bi-directional communication library that communicates asynchronously over WebSockets between the server and remote clients.

### Q17: What happens if an error event is emitted on an EventEmitter with no listener?
**Ans**: By default in Node.js, if an `'error'` event is emitted and has no registered listener, Node.js throws an unhandled exception and crashes the entire process. To prevent this, we explicitly registered an `appEvents.on('error', ...)` handler.

### Q18: Why is it important to validate environment variables on server startup?
**Ans**: If a critical variable like `JWT_SECRET` or `MONGO_URI` is missing or invalid, running the server will lead to unpredictable runtime crashes or severe security vulnerabilities. Validating at startup (Fail-Fast pattern) prevents the application from starting in an insecure state.

### Q19: What does `express.json({ limit: '100kb' })` do?
**Ans**: It parses incoming JSON request bodies, but strictly limits the payload size to 100 kilobytes. This defends the server against Denial-of-Service (DoS) memory exhaustion attacks where an attacker sends massive payloads to crash the server.

### Q20: What is an IDOR vulnerability and how does this project prevent it?
**Ans**: Insecure Direct Object Reference (IDOR) occurs when an application exposes a database key (like a note ID) and does not verify if the current user owns that object. We prevent IDOR by filtering by both `_id` and `userId` on every operation.

### Q21: What is a Rainbow Table and how does bcrypt defend against it?
**Ans**: A Rainbow Table is a precomputed lookup table of common passwords and their corresponding hashes. Bcrypt generates a unique random Salt for every password before hashing, rendering precomputed tables useless.

### Q22: What happens during a graceful shutdown?
**Ans**: When the process receives `SIGINT` (Ctrl+C) or `SIGTERM`, it stops accepting new incoming HTTP connections, finishes existing requests, closes the MongoDB connection cleanly via `closeDB()`, and exits with code 0. This prevents database connection leaks and corrupted in-flight writes.
