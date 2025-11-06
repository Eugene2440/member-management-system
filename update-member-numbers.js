const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, query, orderBy } = require('firebase/firestore');
require('dotenv').config();

// Firebase configuration
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

// Course abbreviation mapping
const courseMapping = {
    'URP': 'URP',
    'URD': 'URD', 
    'CE': 'CE',
    'CM': 'CM',
    'QS': 'QS',
    'CT': 'CT',
    'RE': 'RE',
    'EEE': 'EEE',
    'ME': 'ME',
    'AAE': 'AAE',
    'GE': 'GE',
    'GIC': 'GIC',
    'GIN': 'GIN',
    'SV': 'SV',
    'LA': 'LA',
    'CHE': 'CHE',
    'ARC': 'ARC'
};

async function updateMemberNumbers() {
    try {
        console.log('Starting member number update...');
        
        // Get all members ordered by registration date
        const membersQuery = query(collection(db, 'members'), orderBy('registrationDate', 'asc'));
        const membersSnapshot = await getDocs(membersQuery);
        
        let memberCount = 1;
        const updates = [];
        
        console.log(`Found ${membersSnapshot.size} members to update`);
        
        // Process each member
        for (const memberDoc of membersSnapshot.docs) {
            const memberData = memberDoc.data();
            const courseAbbr = courseMapping[memberData.course] || 'GEN';
            const newMemberNumber = `AECAS/${courseAbbr}/${memberCount.toString().padStart(3, '0')}`;
            
            updates.push({
                id: memberDoc.id,
                oldNumber: memberData.memberNumber,
                newNumber: newMemberNumber,
                name: memberData.name,
                course: memberData.course
            });
            
            memberCount++;
        }
        
        // Show preview of changes
        console.log('\nPreview of changes:');
        console.log('===================');
        updates.forEach((update, index) => {
            console.log(`${index + 1}. ${update.name} (${update.course})`);
            console.log(`   Old: ${update.oldNumber || 'N/A'}`);
            console.log(`   New: ${update.newNumber}`);
            console.log('');
        });
        
        // Confirm before proceeding
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
            rl.question('Do you want to proceed with these updates? (yes/no): ', resolve);
        });
        
        rl.close();
        
        if (answer.toLowerCase() !== 'yes') {
            console.log('Update cancelled.');
            return;
        }
        
        // Apply updates
        console.log('\nApplying updates...');
        let successCount = 0;
        
        for (const update of updates) {
            try {
                const memberRef = doc(db, 'members', update.id);
                await updateDoc(memberRef, {
                    memberNumber: update.newNumber,
                    lastUpdated: new Date().toISOString()
                });
                successCount++;
                console.log(`✓ Updated ${update.name}: ${update.newNumber}`);
            } catch (error) {
                console.error(`✗ Failed to update ${update.name}:`, error.message);
            }
        }
        
        console.log(`\nUpdate complete! ${successCount}/${updates.length} members updated successfully.`);
        
    } catch (error) {
        console.error('Error updating member numbers:', error);
    }
}

// Run the update
updateMemberNumbers();