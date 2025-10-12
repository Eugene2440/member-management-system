const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');
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

async function restoreFirestore(backupFilename) {
    try {
        if (!backupFilename) {
            console.log('Usage: node restore-firestore.js <backup-filename>');
            console.log('Example: node restore-firestore.js firestore-backup-2024-01-01T12-00-00-000Z.json');
            process.exit(1);
        }
        
        const backupPath = path.join(__dirname, 'backups', backupFilename);
        
        if (!fs.existsSync(backupPath)) {
            console.error(`❌ Backup file not found: ${backupPath}`);
            process.exit(1);
        }
        
        console.log(`Starting restore from: ${backupFilename}\n`);
        
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        
        // Restore members collection
        if (backupData.collections.members) {
            console.log('Restoring members collection...');
            for (const member of backupData.collections.members) {
                await setDoc(doc(db, 'members', member.id), member.data);
            }
            console.log(`✓ Restored ${backupData.collections.members.length} members`);
        }
        
        // Restore admins collection
        if (backupData.collections.admins) {
            console.log('Restoring admins collection...');
            for (const admin of backupData.collections.admins) {
                await setDoc(doc(db, 'admins', admin.id), admin.data);
            }
            console.log(`✓ Restored ${backupData.collections.admins.length} admins`);
        }
        
        console.log(`\n✅ Restore completed successfully!`);
        console.log(`📅 Backup timestamp: ${backupData.timestamp}`);
        
    } catch (error) {
        console.error('❌ Error restoring backup:', error);
    }
    
    process.exit(0);
}

// Get backup filename from command line argument
const backupFilename = process.argv[2];
restoreFirestore(backupFilename);