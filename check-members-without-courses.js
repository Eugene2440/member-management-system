require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

async function checkMembersWithoutCourses() {
    try {
        console.log('🔍 Checking members without courses...\n');
        
        const membersSnapshot = await getDocs(collection(db, 'members'));
        
        const membersWithoutCourses = [];
        const confirmedWithoutCourses = [];
        
        membersSnapshot.forEach(doc => {
            const data = doc.data();
            if (!data.course) {
                membersWithoutCourses.push({
                    id: doc.id,
                    name: data.name,
                    email: data.email,
                    department: data.department || 'Not specified',
                    paymentStatus: data.paymentStatus,
                    registrationNumber: data.registrationNumber
                });
                
                if (data.paymentStatus === 'confirmed') {
                    confirmedWithoutCourses.push({
                        id: doc.id,
                        name: data.name,
                        email: data.email,
                        department: data.department || 'Not specified'
                    });
                }
            }
        });
        
        console.log(`📊 Summary:`);
        console.log(`   Total members without courses: ${membersWithoutCourses.length}`);
        console.log(`   Confirmed members without courses: ${confirmedWithoutCourses.length}`);
        
        if (confirmedWithoutCourses.length > 0) {
            console.log(`\n⚠️  PRIORITY: Confirmed members without courses (cannot get registration numbers):`);
            confirmedWithoutCourses.forEach((member, index) => {
                console.log(`   ${index + 1}. ${member.name} (${member.email}) - Department: ${member.department}`);
            });
        }
        
        if (membersWithoutCourses.length > confirmedWithoutCourses.length) {
            console.log(`\n📝 All members without courses:`);
            membersWithoutCourses.forEach((member, index) => {
                const status = member.paymentStatus === 'confirmed' ? '✅ CONFIRMED' : 
                              member.paymentStatus === 'pending' ? '⏳ PENDING' : '❌ REJECTED';
                console.log(`   ${index + 1}. ${member.name} (${member.email}) - ${status} - Dept: ${member.department}`);
            });
        }
        
        console.log(`\n💡 Next steps:`);
        console.log(`   1. Use the admin dashboard to edit each member`);
        console.log(`   2. Select the appropriate course based on their department`);
        console.log(`   3. Registration numbers will be auto-generated for confirmed members`);
        
    } catch (error) {
        console.error('❌ Check failed:', error);
    }
}

checkMembersWithoutCourses();