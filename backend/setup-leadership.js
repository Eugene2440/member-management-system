require('dotenv').config();
const { collection, addDoc } = require('firebase/firestore');
const { db } = require('./config/firebase');

const leaders = [
    { position: 'President', name: 'El-Bethel Buyanzi', description: 'Leading AECAS with vision and dedication.', order: 1 },
    { position: 'Vice President', name: 'Hellen Kwamboka', description: 'Supporting the President and ensuring smooth operations.', order: 2 },
    { position: 'Secretary', name: 'Catherine Mongare', description: 'Managing official records and correspondence.', order: 3 },
    { position: 'Treasurer', name: 'Crispin Mocheche', description: 'Overseeing financial management and budgeting.', order: 4 },
    { position: 'Registrar', name: 'Henry Charles', description: 'Managing member registration and database.', order: 5 },
    { position: 'Organizing Secretary', name: 'Keisy Lenon', description: 'Coordinating meetings and events logistics.', order: 6 },
    { position: 'Events Organizer', name: 'Ronney O. J.', description: 'Planning and executing all AECAS events.', order: 7 },
    { position: 'Communications Director', name: 'Ebby Okumu', description: 'Managing all communications and public relations.', order: 8 },
    { position: 'Assistant Communications Head', name: 'Elvis Mutaki', description: 'Supporting communications and content creation.', order: 9 },
    { position: 'Outreach Coordinator', name: 'Njuguna John', description: 'Building partnerships and coordinating outreach.', order: 10 }
];

async function setupLeadership() {
    try {
        console.log('Starting leadership data import...');
        
        for (const leader of leaders) {
            const leaderData = {
                ...leader,
                photo: null,
                lastUpdated: new Date().toISOString()
            };
            
            await addDoc(collection(db, 'leadership'), leaderData);
            console.log(`✓ Added: ${leader.position} - ${leader.name}`);
        }
        
        console.log('\n✅ Leadership data imported successfully!');
        console.log('You can now manage leaders through the admin dashboard.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error importing leadership data:', error);
        process.exit(1);
    }
}

setupLeadership();
