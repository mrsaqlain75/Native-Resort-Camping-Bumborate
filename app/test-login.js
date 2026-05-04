// test-login.js
import { findUserByEmail } from './api/queries/users.js';
import { verifyPassword } from './api/lib/auth.js';
import dotenv from 'dotenv';

dotenv.config();

async function testLogin() {
  try {
    console.log('Testing login flow...');
    
    const email = 'owner@nativeresort.com';
    const password = 'Owner@123456';
    
    console.log('1. Finding user...');
    const user = await findUserByEmail(email);
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (user) {
      console.log('2. User details:', {
        id: user.id,
        email: user.email,
        role: user.role,
        hasPasswordHash: !!user.passwordHash
      });
      
      console.log('3. Verifying password...');
      const isValid = await verifyPassword(password, user.passwordHash);
      console.log('Password valid:', isValid);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();