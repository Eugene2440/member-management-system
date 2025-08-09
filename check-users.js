const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
require('dotenv').config();

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkUsers() {
    try {
        console.log('🔍 Checking Firebase collections...\n');
        
        // Check admin users
        const adminsSnapshot = await getDocs(collection(db, 'admins'));
        console.log(`👥 Admin Users: ${adminsSnapshot.size}`);
        
        adminsSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`   - ${data.username} (${data.role}): ${data.name}`);
        });
        
        console.log('');
        
        // Check members
        const membersSnapshot = await getDocs(collection(db, 'members'));
        console.log(`👤 Members: ${membersSnapshot.size}`);
        
        if (membersSnapshot.size > 0) {
            console.log('   Recent members:');
            let count = 0;
            membersSnapshot.forEach(doc => {
                if (count < 5) { // Show first 5
                    const data = doc.data();
                    console.log(`   - ${data.name} (${data.membershipType}) - ${data.paymentStatus}`);
                    count++;
                }
            });
            if (membersSnapshot.size > 5) {
                console.log(`   ... and ${membersSnapshot.size - 5} more`);
            }
        }
        
        console.log(`\n📊 Total Users: ${adminsSnapshot.size + membersSnapshot.size}`);
        
    } catch (error) {
        console.error('❌ Error checking users:', error.message);
    }
    process.exit(0);
}

checkUsers();
