const { db } = require('../config/firebase');
const {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc
} = require('firebase/firestore');

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (!arg.startsWith('--')) {
      continue;
    }

    const key = arg.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : '';

    if (value) {
      args[key] = value;
      i += 1;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = (args.email || '').trim().toLowerCase();
  const phone = (args.phone || '').trim();
  const memberNumber = (args.memberNumber || 'AECAS/CE/13').trim();

  if (!email && !phone) {
    console.error('Usage: node backend/scripts/reset-member-number.js --email someone@example.com --memberNumber "AECAS/CE/13"');
    console.error('   or: node backend/scripts/reset-member-number.js --phone 0712345678 --memberNumber "AECAS/CE/13"');
    process.exit(1);
  }

  try {
    const memberQuery = email
      ? query(collection(db, 'members'), where('email', '==', email))
      : query(collection(db, 'members'), where('phone', '==', phone));

    const snapshot = await getDocs(memberQuery);

    if (snapshot.empty) {
      console.error('No member found for the provided email/phone.');
      process.exit(1);
    }

    const memberDoc = snapshot.docs[0];
    const memberData = memberDoc.data();
    const memberRef = doc(db, 'members', memberDoc.id);

    await updateDoc(memberRef, {
      memberNumber,
      lastUpdated: new Date().toISOString()
    });

    console.log('Member number updated successfully.');
    console.log({
      memberId: memberDoc.id,
      name: memberData.name || 'Unknown',
      email: memberData.email || email,
      oldMemberNumber: memberData.memberNumber || 'not set',
      newMemberNumber: memberNumber
    });
  } catch (error) {
    console.error('Failed to update member number:', error);
    process.exit(1);
  }
}

main();
