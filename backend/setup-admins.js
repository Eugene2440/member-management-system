const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, query, where, getDocs } = require('firebase/firestore');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createAdminUser(username, password, name, role = 'admin') {
    try {
        // Check if user already exists
        const q = query(collection(db, 'admins'), where('username', '==', username));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            console.log(`User ${username} already exists!`);
            return;
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create admin user
        const adminData = {
            username,
            password: hashedPassword,
            name,
            role,
            createdAt: new Date().toISOString(),
            isActive: true
        };
        
        const docRef = await addDoc(collection(db, 'admins'), adminData);
        console.log(`Admin user created successfully with ID: ${docRef.id}`);
        console.log(`Username: ${username}`);
        console.log(`Role: ${role}`);
        
    } catch (error) {
        console.error('Error creating admin user:', error);
    }
}

async function setupInitialAdmins() {
    console.log('Setting up initial admin users...\n');
    
    // Create AECSA admin user
    await createAdminUser('theaecsa', 'aecsa8019', 'AECSA Administrator', 'admin');
    await createAdminUser('registrar', 'reg123', 'Registration Officer', 'registrar');
    await createAdminUser('treasurer', 'treas123', 'Treasurer', 'treasurer');
    
    console.log('\nSetup complete!');
    console.log('\nLogin credentials:');
    console.log('Main Admin: theaecsa / aecsa8019');
    console.log('Registrar: registrar / reg123');
    console.log('Treasurer: treasurer / treas123');
    console.log('\n✅ AECSA admin account ready!');
    
    process.exit(0);
}

// Run setup if called directly
if (require.main === module) {
    setupInitialAdmins().catch(console.error);
}

module.exports = { createAdminUser };
