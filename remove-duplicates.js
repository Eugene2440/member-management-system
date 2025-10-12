const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc } = require('firebase/firestore');
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

async function removeDuplicateMembers() {
    try {
        console.log('Starting duplicate member removal...\n');
        
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
        let duplicatesRemoved = 0;
        
        // Process each email group
        for (const [email, memberGroup] of Object.entries(emailGroups)) {
            if (memberGroup.length > 1) {
                duplicatesFound += memberGroup.length - 1;
                console.log(`\n📧 Email: ${email}`);
                console.log(`   Found ${memberGroup.length} duplicates`);
                
                // Sort by registration date (oldest first)
                memberGroup.sort((a, b) => new Date(a.registrationDate) - new Date(b.registrationDate));
                
                // Keep the first (oldest) member
                const keepMember = memberGroup[0];
                console.log(`   ✅ Keeping: ${keepMember.name} (${new Date(keepMember.registrationDate).toLocaleDateString()})`);
                
                // Delete the rest
                for (let i = 1; i < memberGroup.length; i++) {
                    const duplicateMember = memberGroup[i];
                    try {
                        await deleteDoc(doc(db, 'members', duplicateMember.id));
                        console.log(`   ❌ Deleted: ${duplicateMember.name} (${new Date(duplicateMember.registrationDate).toLocaleDateString()})`);
                        duplicatesRemoved++;
                    } catch (error) {
                        console.log(`   ⚠️  Failed to delete: ${duplicateMember.name} - ${error.message}`);
                    }
                }
            }
        }
        
        console.log(`\n✅ Duplicate removal completed!`);
        console.log(`📊 Summary:`);
        console.log(`   - Total members processed: ${members.length}`);
        console.log(`   - Unique emails: ${Object.keys(emailGroups).length}`);
        console.log(`   - Duplicates found: ${duplicatesFound}`);
        console.log(`   - Duplicates removed: ${duplicatesRemoved}`);
        console.log(`   - Remaining members: ${members.length - duplicatesRemoved}`);
        
    } catch (error) {
        console.error('❌ Error removing duplicates:', error);
    }
    
    process.exit(0);
}

removeDuplicateMembers();