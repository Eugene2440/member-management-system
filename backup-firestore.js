const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');
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

async function backupFirestore() {
    try {
        console.log('Starting Firestore backup...\n');
        
        const backup = {
            timestamp: new Date().toISOString(),
            collections: {}
        };
        
        // Backup members collection
        console.log('Backing up members collection...');
        const membersRef = collection(db, 'members');
        const membersSnapshot = await getDocs(membersRef);
        
        backup.collections.members = [];
        membersSnapshot.forEach(doc => {
            backup.collections.members.push({
                id: doc.id,
                data: doc.data()
            });
        });
        console.log(`✓ Backed up ${backup.collections.members.length} members`);
        
        // Backup admins collection
        console.log('Backing up admins collection...');
        const adminsRef = collection(db, 'admins');
        const adminsSnapshot = await getDocs(adminsRef);
        
        backup.collections.admins = [];
        adminsSnapshot.forEach(doc => {
            backup.collections.admins.push({
                id: doc.id,
                data: doc.data()
            });
        });
        console.log(`✓ Backed up ${backup.collections.admins.length} admins`);
        
        // Create backup filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFilename = `firestore-backup-${timestamp}.json`;
        const backupPath = path.join(__dirname, 'backups', backupFilename);
        
        // Create backups directory if it doesn't exist
        const backupsDir = path.join(__dirname, 'backups');
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir);
        }
        
        // Write backup to file
        fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
        
        console.log(`\n✅ Backup completed successfully!`);
        console.log(`📁 Backup saved to: ${backupPath}`);
        console.log(`📊 Total records backed up: ${backup.collections.members.length + backup.collections.admins.length}`);
        
    } catch (error) {
        console.error('❌ Error creating backup:', error);
    }
    
    process.exit(0);
}

backupFirestore();