// scripts/createAdmin.js
/**
 * Safe Admin Provisioning Script for Local Classroom Demonstration
 *
 * Why this script exists:
 * The assignment strictly mandates:
 * 1. No public admin signup route (which would allow unauthorized privilege escalation).
 * 2. No ability for public signups to grant themselves admin status.
 *
 * This command-line script allows the developer/teacher to provision an initial
 * administrative account directly in the local database using safe password hashing.
 *
 * Usage:
 *   node scripts/createAdmin.js [email] [password] [username]
 * Example:
 *   node scripts/createAdmin.js admin@secureconnect.local Admin@12345 admin_root
 */

const bcrypt = require('bcrypt');
const config = require('../src/config/env');
const { connectDB, getDB, closeDB } = require('../src/config/database');

async function provisionAdmin() {
  const args = process.argv.slice(2);
  const email = (args[0] || 'admin@secureconnect.local').trim().toLowerCase();
  const password = args[1] || 'Admin@12345';
  const username = (args[2] || 'admin_root').trim();

  if (password.length < 8) {
    console.error('Error: Admin password must be at least 8 characters.');
    process.exit(1);
  }

  console.log('--- Secure Connect Platform: Admin Provisioning ---');
  console.log(`Target Email    : ${email}`);
  console.log(`Target Username : ${username}`);

  try {
    await connectDB();
    const db = getDB();
    const usersCollection = db.collection('users');

    const existingUser = await usersCollection.findOne({
      $or: [{ email }, { username }],
    });

    const passwordHash = await bcrypt.hash(password, config.BCRYPT_SALT_ROUNDS);
    const now = new Date();

    if (existingUser) {
      console.log(`Found existing account for ${email} / ${username}. Elevating to admin role...`);
      await usersCollection.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            role: 'admin',
            passwordHash,
            updatedAt: now,
          },
        }
      );
      console.log(`Successfully updated user "${existingUser.username}" to role "admin".`);
    } else {
      console.log('Creating new admin user account...');
      const insertResult = await usersCollection.insertOne({
        username,
        email,
        passwordHash,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      });
      console.log(`Admin user created successfully with ID: ${insertResult.insertedId}`);
    }

    console.log('Admin provisioning complete. You can now log in with these credentials.');
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('Error provisioning admin account:', err.message);
  } finally {
    await closeDB();
  }
}

provisionAdmin();
