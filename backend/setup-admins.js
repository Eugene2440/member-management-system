require('dotenv').config();
const { collection, addDoc, getDocs, query, where } = require('firebase/firestore');
const { db } = require('./config/firebase');
const bcrypt = require('bcrypt');

async function setupAdmins() {
    try {
        const admins = [
            { username: 'admin', password: 'admin123', name: 'System Admin', role: 'admin' },
            { username: 'registrar', password: 'reg123', name: 'Registrar', role: 'registrar' },
            { username: 'treasurer', password: 'treas123', name: 'Treasurer', role: 'treasurer' }
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
        console.log('Registrar: registrar / reg123');
        console.log('Treasurer: treasurer / treas123');
        
    } catch (error) {
        console.error('❌ Error setting up admins:', error);
    }
}

setupAdmins();