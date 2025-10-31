require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, query, where } = require('firebase/firestore');

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

async function resetCHECount() {
    try {
        console.log('🔄 Resetting CHE course count...');
        
        // Get all CHE members with new format member numbers
        const cheQuery = query(collection(db, 'members'), where('course', '==', 'CHE'));
        const cheSnapshot = await getDocs(cheQuery);
        
        const cheMembers = [];
        cheSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.memberNumber && data.memberNumber.includes('AECAS/CHE/')) {
                cheMembers.push({ id: doc.id, ...data });
            }
        });
        
        if (cheMembers.length === 0) {
            console.log('❌ No CHE members found with new format member numbers');
            return;
        }
        
        console.log(`📊 Found ${cheMembers.length} CHE members to reset`);
        
        // Sort by registration date to maintain order
        cheMembers.sort((a, b) => new Date(a.registrationDate) - new Date(b.registrationDate));
        
        // Reset numbering starting from 001
        for (let i = 0; i < cheMembers.length; i++) {
            const member = cheMembers[i];
            const newNumber = (i + 1).toString().padStart(3, '0');
            const newMemberNumber = `AECAS/CHE/${newNumber}`;
            
            await updateDoc(doc(db, 'members', member.id), {
                memberNumber: newMemberNumber,
                lastUpdated: new Date().toISOString()
            });
            
            console.log(`✅ ${member.name}: ${member.memberNumber} → ${newMemberNumber}`);
        }
        
        console.log(`\n🎉 CHE count reset complete! Next CHE member will get AECAS/CHE/${(cheMembers.length + 1).toString().padStart(3, '0')}`);
        
    } catch (error) {
        console.error('❌ Reset failed:', error);
    }
}

resetCHECount();