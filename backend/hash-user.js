// backend/hash-user.js
const bcrypt = require('bcrypt');
const db = require('./db'); 


const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'password123'; // 


const saltRounds = 10; // Standard security level for hashing

async function hashAndUpdateUser() {
    try {
        console.log(`Hashing password for user: ${ADMIN_USERNAME}...`);
        
        // Hash the plain text password
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);

        // Update the users table with the secure hash
        const [result] = await db.query(
            'UPDATE users SET password_hash = ? WHERE username = ?',
            [passwordHash, ADMIN_USERNAME]
        );

        if (result.affectedRows > 0) {
            console.log(`✅ User '${ADMIN_USERNAME}' updated successfully.`);
            console.log(`   New Password Hash: ${passwordHash.substring(0, 30)}...`);
        } else {
            console.error(`❌ User '${ADMIN_USERNAME}' not found. Check your users table.`);
        }

    } catch (err) {
        console.error('An error occurred during hashing/update:', err);
    } finally {
        // Exit the script
        process.exit(); 
    }
}

hashAndUpdateUser();
//