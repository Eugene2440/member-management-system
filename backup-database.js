require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');

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

async function backupDatabase() {
    try {
        const backup = {};
        
        // Backup members collection
        const membersSnapshot = await getDocs(collection(db, 'members'));
        backup.members = [];
        membersSnapshot.forEach(doc => {
            backup.members.push({ id: doc.id, ...doc.data() });
        });
        
        // Backup admins collection
        const adminsSnapshot = await getDocs(collection(db, 'admins'));
        backup.admins = [];
        adminsSnapshot.forEach(doc => {
            backup.admins.push({ id: doc.id, ...doc.data() });
        });
        
        // Save backup with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${timestamp}.json`;
        
        fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
        console.log(`✅ Database backup saved to: ${filename}`);
        console.log(`📊 Backed up ${backup.members.length} members and ${backup.admins.length} admins`);
        
    } catch (error) {
        console.error('❌ Backup failed:', error);
    }
}

backupDatabase();