require('dotenv').config();
const { collection, addDoc, getDocs, query, where } = require('firebase/firestore');
const { db } = require('./config/firebase');
const bcrypt = require('bcryptjs');

async function setupAdmins() {
    try {
        const admins = [
            { username: 'spooky', password: 'aecas1028', name: 'Spooky Admin', role: 'admin' },
            { username: 'bethel', password: 'aecas8279', name: 'Bethel Admin', role: 'admin' },
            { username: 'aecas@registrar', password: 'registrar@4629', name: 'Registrar', role: 'registrar' },
            { username: 'aecas@comm', password: 'comm@9842', name: 'Communications Head', role: 'communications' }
        ];

        for (const admin of admins) {
            const existingQuery = query(collection(db, 'admins'), where('username', '==', admin.username));
            const existing = await getDocs(existingQuery);
            
            if (existing.empty) {
                const hashedPassword = await bcrypt.hash(admin.password, 10);
                await addDoc(collection(db, 'admins'), {
                    username: admin.username,
                    password: hashedPassword,
                    name: admin.name,
                    role: admin.role,
                    createdAt: new Date().toISOString()
                });
                console.log(`✓ Created admin: ${admin.username}`);
            } else {
                console.log(`- Admin already exists: ${admin.username}`);
            }
        }
        
        console.log('\n✅ Admin setup complete!');
        console.log('Default credentials:');
        console.log('Admin: admin / admin123');
        console.log('Admin: bethel / aecas8279');
        console.log('Registrar: aecas@registrar / registrar@4629');
        console.log('Communications: aecas@comm / comm@9842');
        
    } catch (error) {
        console.error('❌ Error setting up admins:', error);
    }
}

setupAdmins();