const { createAdminUser } = require('./backend/setup-admins');

async function addNewAdmin() {
    console.log('Adding new administrator account...\n');
    
    await createAdminUser('administrator', 'password123', 'Administrator', 'admin');
    
    console.log('\nNew admin account created!');
    console.log('Username: administrator');
    console.log('Password: password123');
    console.log('Role: admin');
    
    process.exit(0);
}

addNewAdmin().catch(console.error);