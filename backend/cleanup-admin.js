const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, deleteDoc, doc } = require('firebase/firestore');
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

async function removeOldAdminUser() {
    try {
        console.log('Searching for old admin user...');
        
        // Find the old admin user with username 'admin'
        const q = query(collection(db, 'admins'), where('username', '==', 'admin'));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            console.log('Old admin user not found. Nothing to remove.');
            return;
        }
        
        // Delete the old admin user
        querySnapshot.forEach(async (docSnapshot) => {
            await deleteDoc(doc(db, 'admins', docSnapshot.id));
            console.log(`✅ Removed old admin user: ${docSnapshot.data().username}`);
        });
        
        console.log('\n🧹 Cleanup complete!');
        console.log('\nRemaining admin credentials:');
        console.log('Main Admin: theaecsa / aecsa8019');
        console.log('Registrar: registrar / reg123');
        console.log('Treasurer: treasurer / treas123');
        
    } catch (error) {
        console.error('Error removing old admin user:', error);
    }
    
    process.exit(0);
}

// Run cleanup if called directly
if (require.main === module) {
    removeOldAdminUser().catch(console.error);
}

module.exports = { removeOldAdminUser };
