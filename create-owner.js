// create-owner.js
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function createOwner() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root1234', // Your MySQL password
    database: 'nativeresort'
  });

  const email = 'owner@nativeresort.com';
  const password = 'Owner@123456';
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // Check if owner exists
    const [existing] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existing.length === 0) {
      await connection.execute(
        'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
        [email, hashedPassword, 'Owner', 'admin']
      );
      console.log('✅ Owner account created successfully!');
      console.log('Email:', email);
      console.log('Password:', password);
    } else {
      console.log('✅ Owner account already exists');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

createOwner();