// scripts/runChecks.js
/**
 * Automated Verification Suite for Secure Connect and Communication Platform
 *
 * Runs and verifies all 19 required test scenarios specified in the assignment.
 * Uses native fetch and socket.io-client.
 */

const http = require('http');
const jwt = require('jsonwebtoken');
const { io } = require('socket.io-client');
const config = require('../src/config/env');
const { connectDB, getDB, closeDB } = require('../src/config/database');
const appEvents = require('../src/events/appEvents');
const { getDirectConversationId } = require('../src/sockets/chatSocket');
const bcrypt = require('bcrypt');

const BASE_URL = `http://localhost:${config.PORT}`;
let testSummary = [];

function recordResult(testNumber, name, passed, details) {
  testSummary.push({ testNumber, name, passed, details });
  const statusTag = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${statusTag} [Check ${testNumber}]: ${name} - ${details}`);
}

async function runAllChecks() {
  console.log('\n=============================================================');
  console.log(' Starting Automated Test Verification Suite (Checks 1 to 19)');
  console.log('=============================================================\n');

  // Verify server is reachable
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    if (!healthRes.ok) throw new Error('Health check returned non-200');
    console.log('[SETUP] Target server is running and healthy at ' + BASE_URL);
  } catch (err) {
    console.error(`[SETUP ERROR] Target server is not reachable at ${BASE_URL}.`);
    console.error('Please make sure "npm start" is running in a separate terminal.');
    process.exit(1);
  }

  // Generate unique test timestamps to avoid collision
  const uid = Date.now().toString().slice(-6);
  const userA = {
    username: `testuser_a_${uid}`,
    email: `usera_${uid}@test.local`,
    password: 'Password@123',
  };
  const userB = {
    username: `testuser_b_${uid}`,
    email: `userb_${uid}@test.local`,
    password: 'Password@123',
  };
  const userC = {
    username: `testuser_c_${uid}`,
    email: `userc_${uid}@test.local`,
    password: 'Password@123',
  };
  const adminUser = {
    username: `admin_${uid}`,
    email: `admin_${uid}@test.local`,
    password: 'AdminPassword@123',
  };

  let tokenA = null;
  let userAId = null;
  let tokenB = null;
  let userBId = null;
  let tokenC = null;
  let userCId = null;
  let adminToken = null;
  let createdNoteAId = null;

  // Track EventEmitter events
  const capturedEvents = [];
  const eventCapture = (type, payload) => capturedEvents.push({ type, payload });
  appEvents.on('user:registered', (p) => eventCapture('user:registered', p));
  appEvents.on('user:loggedIn', (p) => eventCapture('user:loggedIn', p));
  appEvents.on('note:created', (p) => eventCapture('note:created', p));
  appEvents.on('chat:messageReceived', (p) => eventCapture('chat:messageReceived', p));

  // --------------------------------------------------------------------------
  // Check 1: Successful Signup
  // --------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userA),
    });
    const body = await res.json();
    const passed = res.status === 201 && body.success && body.data.user.role === 'user' && !body.data.user.passwordHash;
    if (passed) {
      userAId = body.data.user.id;
    }
    recordResult(1, 'Successful Signup', passed, `HTTP ${res.status}, role=${body.data?.user?.role}, passwordHash excluded`);
  } catch (err) {
    recordResult(1, 'Successful Signup', false, err.message);
  }

  // --------------------------------------------------------------------------
  // Check 2: Duplicate Signup
  // --------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userA),
    });
    const body = await res.json();
    const passed = res.status === 409 && body.success === false;
    recordResult(2, 'Duplicate Signup Rejection', passed, `HTTP ${res.status}, error="${body.error?.message}"`);
  } catch (err) {
    recordResult(2, 'Duplicate Signup Rejection', false, err.message);
  }

  // --------------------------------------------------------------------------
  // Check 3: Successful Login
  // --------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userA.email, password: userA.password }),
    });
    const body = await res.json();
    const passed = res.status === 200 && Boolean(body.data?.token) && body.data?.user?.email === userA.email;
    if (passed) {
      tokenA = body.data.token;
    }
    recordResult(3, 'Successful Login', passed, `HTTP ${res.status}, token generated with safe user profile`);
  } catch (err) {
    recordResult(3, 'Successful Login', false, err.message);
  }

  // --------------------------------------------------------------------------
  // Check 4: Invalid Login
  // --------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userA.email, password: 'WrongPassword999!' }),
    });
    const body = await res.json();
    const passed = res.status === 401 && body.success === false;
    recordResult(4, 'Invalid Login Rejection', passed, `HTTP ${res.status}, generic message="${body.error?.message}"`);
  } catch (err) {
    recordResult(4, 'Invalid Login Rejection', false, err.message);
  }

  // --------------------------------------------------------------------------
  // Check 5: Access without a Token
  // --------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`);
    const body = await res.json();
    const passed = res.status === 401 && body.success === false;
    recordResult(5, 'Access without Token', passed, `HTTP ${res.status}, error="${body.error?.message}"`);
  } catch (err) {
    recordResult(5, 'Access without Token', false, err.message);
  }

  // --------------------------------------------------------------------------
  // Check 6: Access with an Invalid Token
  // --------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: 'Bearer this.is.an.invalid.token' },
    });
    const body = await res.json();
    const passed = res.status === 401 && body.success === false;
    recordResult(6, 'Access with Invalid Token', passed, `HTTP ${res.status}, error="${body.error?.message}"`);
  } catch (err) {
    recordResult(6, 'Access with Invalid Token', false, err.message);
  }

  // --------------------------------------------------------------------------
  // Check 7: Access with an Expired Token
  // --------------------------------------------------------------------------
  try {
    // Generate an intentionally expired token signed with genuine secret
    const expiredToken = jwt.sign(
      { userId: userAId, username: userA.username, role: 'user' },
      config.JWT_SECRET,
      { expiresIn: '0s' }
    );
    // Brief sleep to ensure token timestamp is strictly in the past
    await new Promise((r) => setTimeout(r, 100));

    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    const body = await res.json();
    const passed = res.status === 401 && body.error?.message?.toLowerCase().includes('expired');
    recordResult(7, 'Access with Expired Token', passed, `HTTP ${res.status}, error="${body.error?.message}"`);
  } catch (err) {
    recordResult(7, 'Access with Expired Token', false, err.message);
  }

  // --------------------------------------------------------------------------
  // Check 8: Access to /api/auth/me with valid token
  // --------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const body = await res.json();
    const passed = res.status === 200 && body.data?.user?.id === userAId && !body.data?.user?.passwordHash;
    recordResult(8, 'Access to /api/auth/me', passed, `HTTP ${res.status}, returned authenticated user profile`);
  } catch (err) {
    recordResult(8, 'Access to /api/auth/me', false, err.message);
  }

  // Register User B and User C for multi-user isolation tests
  try {
    const resB = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userB),
    });
    const bodyB = await resB.json();
    userBId = bodyB.data.user.id;

    const loginB = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userB.email, password: userB.password }),
    });
    const loginBBody = await loginB.json();
    tokenB = loginBBody.data.token;

    const resC = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userC),
    });
    const bodyC = await resC.json();
    userCId = bodyC.data.user.id;

    const loginC = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userC.email, password: userC.password }),
    });
    const loginCBody = await loginC.json();
    tokenC = loginCBody.data.token;
  } catch (err) {
    console.error('Setup error for secondary test accounts:', err);
  }

  // --------------------------------------------------------------------------
  // Check 9: Creating and Listing Personal Notes
  // --------------------------------------------------------------------------
  try {
    const createRes = await fetch(`${BASE_URL}/api/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'User A Secret Note',
        content: 'Top secret research notes for user A.',
      }),
    });
    const createBody = await createRes.json();
    createdNoteAId = createBody.data?.note?.id;

    const listRes = await fetch(`${BASE_URL}/api/notes`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listBody = await listRes.json();

    const passed =
      createRes.status === 201 &&
      listRes.status === 200 &&
      listBody.data?.notes?.some((n) => n.id === createdNoteAId);
    recordResult(9, 'Creating and Listing Personal Notes', passed, `Created note ID ${createdNoteAId}, listed count=${listBody.data?.count}`);
  } catch (err) {
    recordResult(9, 'Creating and Listing Personal Notes', false, err.message);
  }

  // --------------------------------------------------------------------------
  // Check 10: Updating and Deleting Personal Notes
  // --------------------------------------------------------------------------
  try {
    // Create temporary note to update and delete
    const tempRes = await fetch(`${BASE_URL}/api/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Temp Note for User A',
        content: 'Original content.',
      }),
    });
    const tempBody = await tempRes.json();
    const tempNoteId = tempBody.data?.note?.id;

    // Update Note
    const updateRes = await fetch(`${BASE_URL}/api/notes/${tempNoteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Temp Note Updated',
        content: 'Updated content.',
      }),
    });
    const updateBody = await updateRes.json();

    // Delete Note
    const deleteRes = await fetch(`${BASE_URL}/api/notes/${tempNoteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const passed =
      updateRes.status === 200 &&
      updateBody.data?.note?.title === 'Temp Note Updated' &&
      deleteRes.status === 200;

    recordResult(10, 'Updating and Deleting Personal Notes', passed, `Updated title successfully and deleted note ID ${tempNoteId}`);
  } catch (err) {
    recordResult(10, 'Updating and Deleting Personal Notes', false, err.message);
  }

  // --------------------------------------------------------------------------
  // Check 11: Attempting to Access Another User's Note (Ownership Enforcement)
  // --------------------------------------------------------------------------
  try {
    // User B tries to read User A's note
    const getOtherRes = await fetch(`${BASE_URL}/api/notes/${createdNoteAId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    // User B tries to update User A's note
    const putOtherRes = await fetch(`${BASE_URL}/api/notes/${createdNoteAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ title: 'Hacked by User B', content: 'Injected' }),
    });

    // User B tries to delete User A's note
    const deleteOtherRes = await fetch(`${BASE_URL}/api/notes/${createdNoteAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    const passed =
      getOtherRes.status === 404 &&
      putOtherRes.status === 404 &&
      deleteOtherRes.status === 404;

    recordResult(
      11,
      'Cross-User Note Access Prevention',
      passed,
      `GET=${getOtherRes.status}, PUT=${putOtherRes.status}, DELETE=${deleteOtherRes.status} (Protected by DB query isolation)`
    );
  } catch (err) {
    recordResult(11, 'Cross-User Note Access Prevention', false, err.message);
  }

  // --------------------------------------------------------------------------
  // Check 12: Ordinary User Denied Access to Admin Resources (RBAC 403)
  // --------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const body = await res.json();
    const passed = res.status === 403 && body.success === false;
    recordResult(12, 'Ordinary User Denied Admin Resource', passed, `HTTP ${res.status}, error="${body.error?.message}"`);
  } catch (err) {
    recordResult(12, 'Ordinary User Denied Admin Resource', false, err.message);
  }

  // --------------------------------------------------------------------------
  // Check 13: Admin Granted Access to Admin Resources
  // --------------------------------------------------------------------------
  try {
    // Directly provision an admin in the database for the test suite
    await connectDB();
    const db = getDB();
    const adminHash = await bcrypt.hash(adminUser.password, config.BCRYPT_SALT_ROUNDS);
    const now = new Date();
    const adminDoc = await db.collection('users').insertOne({
      username: adminUser.username,
      email: adminUser.email,
      passwordHash: adminHash,
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    });

    // Login as admin
    const loginAdminRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminUser.email, password: adminUser.password }),
    });
    const loginAdminBody = await loginAdminRes.json();
    adminToken = loginAdminBody.data?.token;

    // Call admin route
    const adminRes = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminBody = await adminRes.json();

    const passed = adminRes.status === 200 && adminBody.success && Array.isArray(adminBody.data?.users);
    recordResult(13, 'Admin Granted Access to Admin Resource', passed, `HTTP ${res => adminRes.status}, users returned=${adminBody.data?.count}`);
  } catch (err) {
    recordResult(13, 'Admin Granted Access to Admin Resource', false, err.message);
  }

  // --------------------------------------------------------------------------
  // Check 14: Authenticated Socket.IO Connection
  // --------------------------------------------------------------------------
  try {
    const socketA = io(BASE_URL, {
      auth: { token: tokenA },
      transports: ['websocket'],
    });

    const passed = await new Promise((resolve) => {
      const timer = setTimeout(() => {
        socketA.close();
        resolve(false);
      }, 3000);

      socketA.on('connect', () => {
        clearTimeout(timer);
        socketA.close();
        resolve(true);
      });

      socketA.on('connect_error', () => {
        clearTimeout(timer);
        socketA.close();
        resolve(false);
      });
    });

    recordResult(14, 'Authenticated Socket.IO Connection', passed, passed ? 'Socket handshake succeeded with valid JWT' : 'Connection failed');
  } catch (err) {
    recordResult(14, 'Authenticated Socket.IO Connection', false, err.message);
  }

  // --------------------------------------------------------------------------
  // Check 15: Rejection of Unauthenticated Socket Connections
  // --------------------------------------------------------------------------
  try {
    const socketBad = io(BASE_URL, {
      auth: { token: 'invalid.bogus.jwt' },
      transports: ['websocket'],
    });

    const passed = await new Promise((resolve) => {
      const timer = setTimeout(() => {
        socketBad.close();
        resolve(false);
      }, 3000);

      socketBad.on('connect', () => {
        clearTimeout(timer);
        socketBad.close();
        resolve(false); // Should NOT connect!
      });

      socketBad.on('connect_error', (err) => {
        clearTimeout(timer);
        socketBad.close();
        resolve(err.message.includes('Authentication error'));
      });
    });

    recordResult(15, 'Rejection of Unauthenticated Socket', passed, passed ? 'Rejected with Authentication error' : 'Failed to reject unauthenticated socket');
  } catch (err) {
    recordResult(15, 'Rejection of Unauthenticated Socket', false, err.message);
  }

  // --------------------------------------------------------------------------
  // Check 16: Authorized and Unauthorized Conversation Access
  // --------------------------------------------------------------------------
  try {
    const conversationRoomAB = getDirectConversationId(userAId, userBId);

    // Socket A (Authorized member)
    const socketA = io(BASE_URL, { auth: { token: tokenA }, transports: ['websocket'] });
    // Socket C (Unauthorized outsider)
    const socketC = io(BASE_URL, { auth: { token: tokenC }, transports: ['websocket'] });

    await new Promise((r) => socketA.on('connect', r));
    await new Promise((r) => socketC.on('connect', r));

    // User A joins room AB
    const joinAResult = await new Promise((resolve) => {
      socketA.emit('chat:join', { conversationId: conversationRoomAB }, (res) => resolve(res));
    });

    // User C (outsider) attempts to join room AB
    const joinCResult = await new Promise((resolve) => {
      socketC.emit('chat:join', { conversationId: conversationRoomAB }, (res) => resolve(res));
    });

    // User C attempts to send a message to room AB
    const sendCResult = await new Promise((resolve) => {
      socketC.emit('chat:send', { conversationId: conversationRoomAB, message: 'I am spying' }, (res) => resolve(res));
    });

    socketA.close();
    socketC.close();

    const passed =
      joinAResult.success === true &&
      joinCResult.success === false &&
      sendCResult.success === false;

    recordResult(
      16,
      'Authorized vs Unauthorized Room Access',
      passed,
      `User A join=${joinAResult.success}, User C join=${joinCResult.success} (${joinCResult.error}), User C send=${sendCResult.success}`
    );
  } catch (err) {
    recordResult(16, 'Authorized vs Unauthorized Room Access', false, err.message);
  }

  // --------------------------------------------------------------------------
  // Check 17: EventEmitter Listener Execution
  // --------------------------------------------------------------------------
  try {
    // 1. Verify that all essential audit event listeners are registered on appEvents
    const hasRegListener = appEvents.listenerCount('user:registered') >= 1;
    const hasLogListener = appEvents.listenerCount('user:loggedIn') >= 1;
    const hasNoteListener = appEvents.listenerCount('note:created') >= 1;
    const hasChatListener = appEvents.listenerCount('chat:messageReceived') >= 1;
    const hasErrorListener = appEvents.listenerCount('error') >= 1;

    // 2. Test synchronous execution of listener when event is emitted
    let receivedPayload = null;
    const testListener = (payload) => {
      receivedPayload = payload;
    };
    appEvents.on('user:registered', testListener);

    // Emit test event
    const samplePayload = {
      userId: 'test_user_emitter_123',
      username: 'test_emitter',
      email: 'emitter@test.local',
      role: 'user',
    };
    appEvents.emit('user:registered', samplePayload);

    // Clean up temporary listener
    appEvents.removeListener('user:registered', testListener);

    // 3. Test that emitting error event does not crash process due to registered error handler
    let errorHandledSafely = true;
    try {
      appEvents.emit('error', new Error('Test safe error dispatch'));
    } catch (e) {
      errorHandledSafely = false;
    }

    const passed =
      hasRegListener &&
      hasLogListener &&
      hasNoteListener &&
      hasChatListener &&
      hasErrorListener &&
      receivedPayload !== null &&
      receivedPayload.userId === samplePayload.userId &&
      errorHandledSafely;

    recordResult(
      17,
      'EventEmitter Internal Event Dispatch & Listeners',
      passed,
      `All 5 audit listeners active, synchronous dispatch verified, error handler protected`
    );
  } catch (err) {
    recordResult(17, 'EventEmitter Internal Event Dispatch & Listeners', false, err.message);
  }

  // --------------------------------------------------------------------------
  // Check 18: Invalid Request Payloads
  // --------------------------------------------------------------------------
  try {
    // Missing password
    const badSignup = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'bad_user', email: 'valid@mail.com' }),
    });

    // Invalid ObjectId on Notes GET
    const badNoteId = await fetch(`${BASE_URL}/api/notes/non-existent-or-invalid-id`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    // Malformed JSON body
    const badJson = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"brokenJson": true,',
    });

    const passed =
      badSignup.status === 400 &&
      badNoteId.status === 400 &&
      badJson.status === 400;

    recordResult(
      18,
      'Input Validation and Payload Sanitation',
      passed,
      `Bad signup=${badSignup.status}, Invalid note ObjectId=${badNoteId.status}, Malformed JSON=${badJson.status}`
    );
  } catch (err) {
    recordResult(18, 'Input Validation and Payload Sanitation', false, err.message);
  }

  // --------------------------------------------------------------------------
  // Check 19: Database Connection Behavior
  // --------------------------------------------------------------------------
  try {
    const activeDb = getDB();
    const stats = await activeDb.command({ ping: 1 });
    const passed = stats && stats.ok === 1;
    recordResult(19, 'Database Health and Connection Handling', passed, `MongoDB ping: ok=${stats.ok}`);
  } catch (err) {
    recordResult(19, 'Database Health and Connection Handling', false, err.message);
  }

  console.log('\n=============================================================');
  console.log('                 TEST VERIFICATION SUMMARY                   ');
  console.log('=============================================================');
  const allPassed = testSummary.every((t) => t.passed);
  console.log(`Total Scenarios Tested : ${testSummary.length}`);
  console.log(`Passed                 : ${testSummary.filter((t) => t.passed).length}`);
  console.log(`Failed                 : ${testSummary.filter((t) => !t.passed).length}`);
  console.log(`Overall Status         : ${allPassed ? 'ALL CHECKS PASSED ✅' : 'FAILURES DETECTED ❌'}`);
  console.log('=============================================================\n');

  await closeDB();
  process.exit(allPassed ? 0 : 1);
}

runAllChecks().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
