const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');
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

function cleanPhoneNumber(phone) {
    if (!phone) return phone;
    // Remove all non-digit characters
    return phone.replace(/\D/g, '');
}

async function cleanAllPhoneNumbers() {
    try {
        console.log('Starting phone number cleanup...\n');
        
        const membersRef = collection(db, 'members');
        const snapshot = await getDocs(membersRef);
        
        let updated = 0;
        let total = 0;
        
        for (const docSnap of snapshot.docs) {
            total++;
            const data = docSnap.data();
            const originalPhone = data.phone;
            const cleanedPhone = cleanPhoneNumber(originalPhone);
            
            if (originalPhone !== cleanedPhone) {
                await updateDoc(doc(db, 'members', docSnap.id), {
                    phone: cleanedPhone
                });
                console.log(`Updated: ${originalPhone} → ${cleanedPhone}`);
                updated++;
            }
        }
        
        console.log(`\nCleanup complete!`);
        console.log(`Total members: ${total}`);
        console.log(`Phone numbers updated: ${updated}`);
        
    } catch (error) {
        console.error('Error cleaning phone numbers:', error);
    }
    
    process.exit(0);
}

cleanAllPhoneNumbers();