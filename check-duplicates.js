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

async function checkDuplicateMembers() {
    try {
        console.log('Checking for duplicate members...\n');
        
        const membersRef = collection(db, 'members');
        const snapshot = await getDocs(membersRef);
        
        const members = [];
        snapshot.forEach(doc => {
            members.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`Total members found: ${members.length}`);
        
        // Group members by email (case-insensitive)
        const emailGroups = {};
        members.forEach(member => {
            const email = member.email.toLowerCase().trim();
            if (!emailGroups[email]) {
                emailGroups[email] = [];
            }
            emailGroups[email].push(member);
        });
        
        let duplicatesFound = 0;
        
        // Check each email group
        for (const [email, memberGroup] of Object.entries(emailGroups)) {
            if (memberGroup.length > 1) {
                duplicatesFound += memberGroup.length - 1;
                console.log(`\n📧 Email: ${email}`);
                console.log(`   Found ${memberGroup.length} duplicates`);
                
                // Sort by registration date (oldest first)
                memberGroup.sort((a, b) => new Date(a.registrationDate) - new Date(b.registrationDate));
                
                memberGroup.forEach((member, index) => {
                    const status = index === 0 ? '✅ KEEP' : '❌ DELETE';
                    console.log(`   ${status}: ${member.name} - ${new Date(member.registrationDate).toLocaleDateString()}`);
                });
            }
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`   - Total members: ${members.length}`);
        console.log(`   - Unique emails: ${Object.keys(emailGroups).length}`);
        console.log(`   - Duplicates found: ${duplicatesFound}`);
        console.log(`   - Members after cleanup: ${members.length - duplicatesFound}`);
        
        if (duplicatesFound > 0) {
            console.log(`\n⚠️  To actually remove duplicates, run: node remove-duplicates.js`);
        } else {
            console.log(`\n✅ No duplicates found!`);
        }
        
    } catch (error) {
        console.error('❌ Error checking duplicates:', error);
    }
    
    process.exit(0);
}

checkDuplicateMembers();