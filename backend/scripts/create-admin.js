const bcrypt = require('bcryptjs');
const { collection, addDoc, query, where, getDocs } = require('firebase/firestore');
const { db } = require('../config/firebase');
require('dotenv').config();

async function createAdmin() {
    try {
        const username = 'aecas@dev';
        const password = 'Aecas@Kilar.604';
        const name = 'AECAS Admin';
        const role = 'admin';

        // Check if admin already exists
        const q = query(collection(db, 'admins'), where('username', '==', username));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            console.log('Admin user already exists!');
            console.log('Username:', username);
            return;
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create admin user
        const adminData = {
            username: username,
            password: hashedPassword,
            name: name,
            role: role,
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'admins'), adminData);

        console.log('✅ Admin user created successfully!');
        console.log('Document ID:', docRef.id);
        console.log('Username:', username);
        console.log('Password:', password);
        console.log('\nYou can now login at: http://localhost:3000/login');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        process.exit(1);
    }
}

createAdmin();
