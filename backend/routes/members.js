const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
  limit
} = require('firebase/firestore');
const { db } = require('../config/firebase');
const { verifyToken, verifyRole } = require('../middleware/auth');
const {
  sendWelcomeEmail,
  sendPaymentConfirmedEmail,
  sendPaymentRejectedEmail,
  sendRenewalConfirmedEmail
} = require('../services/email');
const {
  RENEWAL_FEE_KES,
  getRenewalCycleEnd,
  getEffectiveMembershipStatus,
  isRenewalEligible
} = require('../services/renewalCycle');

const router = express.Router();

// ==========================================
// 1. RATE LIMITERS (express-rate-limit)
// ==========================================

const publicLookupRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again shortly.'
  }
});

const registrationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many registration attempts. Please try again later.'
  }
});

// ==========================================
// 2. HELPER UTILITIES & SCHEMAS
// ==========================================

function normalizeIdentifier(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizePhone(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function getCourseCode(memberData) {
  const courseMapping = {
    URP: 'URP', URD: 'URD', CE: 'CE', CM: 'CM', QS: 'QS', CT: 'CT', RE: 'RE',
    EEE: 'EEE', ME: 'ME', AAE: 'AAE', GE: 'GE', GIC: 'GIC', GIN: 'GIN',
    SV: 'SV', LA: 'LA', CHE: 'CHE', ARC: 'ARC'
  };

  if (memberData.memberType === 'non-student') {
    const rawArea = String(memberData.areaOfInterest || 'GEN').trim().toUpperCase();
    return courseMapping[rawArea] || 'GEN';
  }

  const rawCourse = String(memberData.course || 'GEN').trim().toUpperCase();
  return courseMapping[rawCourse] || 'GEN';
}

async function generateMemberNumberInTransaction(transaction, memberData) {
  const memberType = memberData.memberType === 'non-student' ? 'non-student' : 'student';
  const courseCode = getCourseCode(memberData);
  const memberPrefix = memberType === 'non-student' ? `AECAS/ASS/${courseCode}/` : `AECAS/${courseCode}/`;
  const rangeEnd = `${memberPrefix}\uf8ff`;

  const membersQuery = query(
    collection(db, 'members'),
    where('memberNumber', '>=', memberPrefix),
    where('memberNumber', '<', rangeEnd),
    orderBy('memberNumber', 'desc'),
    limit(1)
  );

  const snapshot = await transaction.get(membersQuery);
  let nextNumber = 1;

  if (!snapshot.empty) {
    const lastNumber = snapshot.docs[0].data()?.memberNumber;
    if (typeof lastNumber === 'string') {
      const lastNumberSegment = Number.parseInt(lastNumber.split('/').pop(), 10);
      if (!Number.isNaN(lastNumberSegment)) {
        nextNumber = lastNumberSegment + 1;
      }
    }
  }

  return `${memberPrefix}${String(nextNumber).padStart(3, '0')}`;
}

async function generateMemberNumber(memberData) {
  if (memberData.memberNumber) {
    return memberData.memberNumber;
  }

  try {
    return await runTransaction(db, async (transaction) => {
      return generateMemberNumberInTransaction(transaction, memberData);
    });
  } catch (error) {
    console.error('Error generating member number:', error);
    if (memberData.memberNumber) {
      return memberData.memberNumber;
    }

    const courseCode = getCourseCode(memberData);
    const fallbackNumber = memberData.memberType === 'non-student'
      ? `AECAS/ASS/${courseCode}/001`
      : `AECAS/${courseCode}/001`;

    return fallbackNumber;
  }
}

function buildLookupVariants(fieldName, rawValue) {
  const variants = new Set();
  const value = String(rawValue ?? '').trim();

  if (!value) {
    return [];
  }

  variants.add(value);

  if (fieldName === 'email') {
    const normalizedEmail = normalizeEmail(value);
    variants.add(normalizedEmail);
    variants.add(normalizeIdentifier(value));
  }

  if (fieldName === 'phone') {
    const digitsOnly = value.replace(/\D/g, '');
    variants.add(normalizePhone(value));
    variants.add(digitsOnly);
    variants.add(normalizeIdentifier(value));

    if (digitsOnly.startsWith('254')) {
      variants.add(`0${digitsOnly.slice(3)}`);
    }

    if (digitsOnly.startsWith('0')) {
      variants.add(`+254${digitsOnly.slice(1)}`);
    }
  }

  if (fieldName === 'memberNumber') {
    variants.add(value.toUpperCase());
    variants.add(normalizeIdentifier(value));
  }

  return [...variants].filter(Boolean);
}

async function findMemberByIdentifiers({ memberNumber, email, phone }) {
  const suppliedValues = {
    memberNumber: normalizeIdentifier(memberNumber),
    email: normalizeIdentifier(email),
    phone: normalizeIdentifier(phone)
  };

  const providedFields = Object.entries(suppliedValues)
    .filter(([, value]) => Boolean(value))
    .map(([field]) => field);

  if (providedFields.length < 2) {
    return {
      member: null,
      reason: 'Please provide any two of the following: member number, email, or phone number.'
    };
  }

  try {
    const candidateMap = new Map();

    for (const fieldName of providedFields) {
      const rawValue = fieldName === 'memberNumber' ? memberNumber : fieldName === 'email' ? email : phone;
      const lookupVariants = buildLookupVariants(fieldName, rawValue);

      for (const lookupValue of lookupVariants) {
        const lookupQuery = query(collection(db, 'members'), where(fieldName, '==', lookupValue));
        const snapshot = await getDocs(lookupQuery);

        snapshot.forEach((memberDoc) => {
          const member = { id: memberDoc.id, ...memberDoc.data() };
          const currentEntry = candidateMap.get(memberDoc.id) || { member, matchCount: 0 };
          currentEntry.matchCount += 1;
          candidateMap.set(memberDoc.id, currentEntry);
        });
      }
    }

    const matches = [...candidateMap.values()].filter(({ member }) => {
      let validMatches = 0;

      if (suppliedValues.memberNumber && normalizeIdentifier(member.memberNumber) === suppliedValues.memberNumber) {
        validMatches += 1;
      }
      if (suppliedValues.email && normalizeIdentifier(member.email) === suppliedValues.email) {
        validMatches += 1;
      }
      if (suppliedValues.phone && normalizeIdentifier(member.phone) === suppliedValues.phone) {
        validMatches += 1;
      }

      return validMatches >= 2;
    });

    if (matches.length === 0) {
      return { member: null, reason: 'No matching member was found for the details provided.' };
    }

    return { member: matches[0].member, reason: null };
  } catch (error) {
    console.error('Error finding member by identifiers:', error);
    return {
      member: null,
      reason: 'We could not look up the member right now. Please try again.'
    };
  }
}

// Zod schemas for input validation
const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Invalid email address'),
  phone: z.string().trim().min(5, 'Invalid phone number'),
  paymentReference: z.string().trim().min(1, 'Payment reference is required'),
  consent: z.literal(true, { errorMap: () => ({ message: 'You must agree to the Terms of Service and Privacy Policy' }) }),
  memberType: z.enum(['student', 'non-student']).default('student'),
  course: z.string().trim().optional(),
  registrationNumber: z.string().trim().optional().nullable(),
  areaOfInterest: z.string().trim().optional()
}).refine(data => data.memberType !== 'student' || Boolean(data.course), {
  message: 'Course is required for student registration',
  path: ['course']
}).refine(data => data.memberType !== 'non-student' || Boolean(data.areaOfInterest), {
  message: 'Area of interest is required for non-student registration',
  path: ['areaOfInterest']
});

// ==========================================
// 3. PUBLIC ROUTES
// ==========================================

// Get email preferences (for unsubscribe page)
router.get('/preferences', async (req, res) => {
  try {
    const { email } = req.query || {};

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is invalid' });
    }

    const emailQuery = query(collection(db, 'members'), where('email', '==', normalizedEmail));
    const snapshot = await getDocs(emailQuery);

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const memberData = snapshot.docs[0].data();
    const preferences = memberData.emailPreferences || {
      events: true,
      announcements: true
    };

    return res.json({ success: true, preferences });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update email preferences (for unsubscribe page)
router.post('/preferences', async (req, res) => {
  try {
    const requestBody = req.body || {};
    const { email, preferences = {} } = requestBody;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is invalid' });
    }

    const emailQuery = query(collection(db, 'members'), where('email', '==', normalizedEmail));
    const snapshot = await getDocs(emailQuery);

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const memberDoc = snapshot.docs[0];
    const nextPreferences = {
      events: preferences.events !== false,
      announcements: preferences.announcements !== false,
      marketing: preferences.marketing !== false
    };

    await updateDoc(doc(db, 'members', memberDoc.id), {
      emailPreferences: nextPreferences,
      lastUpdated: new Date().toISOString()
    });

    return res.json({ success: true, message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Member registration
router.post('/register', registrationRateLimiter, async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body || {});
    
    const normalizedEmail = normalizeEmail(validatedData.email);
    const normalizedPhone = normalizePhone(validatedData.phone);
    const normalizedPaymentReference = validatedData.paymentReference.trim();

    const memberData = {
      name: validatedData.name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      paymentReference: normalizedPaymentReference,
      memberType: validatedData.memberType,
      membershipType: 'pending',
      paymentStatus: 'pending',
      registrationDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      consentGiven: true,
      consentTimestamp: new Date().toISOString(),
      consentVersion: '1.0',
      emailPreferences: {
        events: true,
        announcements: true,
        marketing: true
      }
    };

    if (validatedData.memberType === 'student') {
      memberData.course = validatedData.course.trim();
      memberData.registrationNumber = validatedData.registrationNumber ? validatedData.registrationNumber.trim() : null;
      memberData.department = null;
    } else {
      memberData.areaOfInterest = validatedData.areaOfInterest.trim();
    }

    // Pre-check duplicates OUTSIDE transaction to prevent read-after-write errors
    const emailQuery = query(collection(db, 'members'), where('email', '==', normalizedEmail), limit(1));
    const phoneQuery = query(collection(db, 'members'), where('phone', '==', normalizedPhone), limit(1));
    const paymentQuery = query(collection(db, 'members'), where('paymentReference', '==', normalizedPaymentReference), limit(1));

    const [emailSnap, phoneSnap, paymentSnap] = await Promise.all([
      getDocs(emailQuery),
      getDocs(phoneQuery),
      getDocs(paymentQuery)
    ]);

    if (!emailSnap.empty) return res.status(400).json({ error: 'A member with this email address is already registered' });
    if (!phoneSnap.empty) return res.status(400).json({ error: 'A member with this phone number is already registered' });
    if (!paymentSnap.empty) return res.status(400).json({ error: 'This payment reference has already been used' });

    const memberRef = doc(collection(db, 'members'));

    const memberNumber = await runTransaction(db, async (transaction) => {
      const generatedMemberNumber = await generateMemberNumberInTransaction(transaction, memberData);
      memberData.memberNumber = generatedMemberNumber;
      transaction.set(memberRef, memberData);
      return generatedMemberNumber;
    });

    sendWelcomeEmail(memberData).catch((err) => {
      console.error('Failed to send welcome email:', err);
    });

    return res.status(201).json({
      success: true,
      message: 'Member registered successfully',
      memberId: memberRef.id,
      memberNumber
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
    }
    console.error('Error registering member:', error);
    const message = error?.message || 'Failed to register member';
    return res.status(400).json({ error: message });
  }
});

// Find and verify a member for annual renewal
router.post('/renewal/verify', publicLookupRateLimiter, async (req, res) => {
  try {
    const { memberNumber, email, phone } = req.body || {};
    const result = await findMemberByIdentifiers({ memberNumber, email, phone });

    if (!result.member) {
      return res.status(404).json({ success: false, error: result.reason || 'No matching member was found.' });
    }

    const member = result.member;
    const eligible = isRenewalEligible(member);

    if (!eligible) {
      return res.status(400).json({
        success: false,
        error: 'This member is not eligible for annual renewal at the moment.',
        member: {
          id: member.id,
          name: member.name,
          email: member.email,
          phone: member.phone,
          memberNumber: member.memberNumber,
          paymentStatus: member.paymentStatus,
          membershipStatus: member.membershipStatus || 'active'
        }
      });
    }

    return res.json({
      success: true,
      amount: RENEWAL_FEE_KES,
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone,
        memberNumber: member.memberNumber,
        paymentStatus: member.paymentStatus,
        membershipStatus: member.membershipStatus || 'active',
        registrationDate: member.registrationDate
      }
    });
  } catch (error) {
    console.error('Error verifying renewal eligibility:', error);
    return res.status(500).json({ error: 'Failed to verify member renewal details.' });
  }
});

// Create annual renewal request
router.post('/renewal/request', publicLookupRateLimiter, async (req, res) => {
  try {
    const requestBody = req.body || {};
    const { memberNumber, email, phone, paymentReference, notes } = requestBody;

    if (!paymentReference) {
      return res.status(400).json({ error: 'Payment reference is required for renewal.' });
    }

    const result = await findMemberByIdentifiers({ memberNumber, email, phone });
    if (!result.member) {
      return res.status(404).json({ success: false, error: result.reason || 'No matching member was found.' });
    }

    const memberId = result.member.id;
    const memberRef = doc(db, 'members', memberId);
    const trimmedNotes = notes ? String(notes).trim().slice(0, 500) : null;

    // Re-validate and write inside a transaction so two concurrent
    // submissions cannot both slip past the pending-request check.
    const outcome = await runTransaction(db, async (transaction) => {
      const memberDoc = await transaction.get(memberRef);

      if (!memberDoc.exists()) {
        return { status: 404, error: 'No matching member was found.' };
      }

      const memberData = { id: memberDoc.id, ...memberDoc.data() };

      if (memberData.membershipStatus === 'renewal_pending') {
        return { status: 409, error: 'This member already has a renewal request pending admin review.' };
      }

      if (!isRenewalEligible(memberData)) {
        return { status: 400, error: 'This member is not eligible for annual renewal at the moment.' };
      }

      transaction.update(memberRef, {
        membershipStatus: 'renewal_pending',
        renewalRequestedAt: new Date().toISOString(),
        renewalReference: String(paymentReference).trim(),
        renewalAmount: RENEWAL_FEE_KES,
        renewalNotes: trimmedNotes,
        lastUpdated: new Date().toISOString()
      });

      return { status: 200 };
    });

    if (outcome.status !== 200) {
      return res.status(outcome.status).json({ success: false, error: outcome.error });
    }

    return res.json({
      success: true,
      message: 'Annual membership renewal request submitted successfully. Please wait for admin confirmation.',
      amount: RENEWAL_FEE_KES,
      memberId
    });
  } catch (error) {
    console.error('Error creating renewal request:', error);
    return res.status(500).json({ error: 'Failed to submit renewal request.' });
  }
});

// ==========================================
// 4. PROTECTED ROUTES (AUTHENTICATION REQUIRED)
// ==========================================

router.use(verifyToken);

// Get all members (registrar and admin only)
router.get('/', verifyRole(['registrar', 'admin']), async (req, res) => {
  try {
    const { search, paymentStatus, membershipType } = req.query || {};

    let queryBuilder = collection(db, 'members');

    if (paymentStatus) {
      queryBuilder = query(queryBuilder, where('paymentStatus', '==', paymentStatus));
    }

    if (membershipType) {
      queryBuilder = query(queryBuilder, where('membershipType', '==', membershipType));
    }

    queryBuilder = query(queryBuilder, orderBy('registrationDate', 'desc'));

    const querySnapshot = await getDocs(queryBuilder);
    const members = [];

    querySnapshot.forEach((memberDoc) => {
      const memberData = { id: memberDoc.id, ...memberDoc.data() };
      memberData.membershipStatus = getEffectiveMembershipStatus(memberData);

      if (search) {
        const searchLower = search.toLowerCase();
        const nameMatch = memberData.name?.toLowerCase().includes(searchLower);
        const emailMatch = memberData.email?.toLowerCase().includes(searchLower);
        const phoneMatch = String(memberData.phone || '').includes(search);

        if (nameMatch || emailMatch || phoneMatch) {
          members.push(memberData);
        }
      } else {
        members.push(memberData);
      }
    });

    return res.json({ success: true, members });
  } catch (error) {
    console.error('Error fetching members:', error);
    return res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Update member details (registrar and admin only)
router.put('/:id', verifyRole(['registrar', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...(req.body || {}) };

    updateData.lastUpdated = new Date().toISOString();

    delete updateData.id;
    delete updateData.registrationDate;

    if (updateData.course || updateData.areaOfInterest) {
      const memberDoc = await getDoc(doc(db, 'members', id));
      if (memberDoc.exists()) {
        const memberData = { ...memberDoc.data(), ...updateData };
        if (memberData.paymentStatus === 'confirmed' && !memberData.memberNumber) {
          updateData.memberNumber = await generateMemberNumber(memberData);
        }
      }
    }

    const memberRef = doc(db, 'members', id);
    await updateDoc(memberRef, updateData);

    return res.json({ success: true, message: 'Member updated successfully' });
  } catch (error) {
    console.error('Error updating member:', error);
    return res.status(500).json({ error: 'Failed to update member' });
  }
});

// Confirm annual renewal request (registrar and admin only)
router.patch('/:id/renewal/confirm', verifyRole(['registrar', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { renewalReference, notes } = req.body || {};

    const memberRef = doc(db, 'members', id);
    const memberDoc = await getDoc(memberRef);

    if (!memberDoc.exists()) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const memberData = memberDoc.data();
    const now = new Date();

    // The confirmed renewal activates the membership cycle that is current at
    // confirmation time, so the renewed term runs until that cycle ends
    // (the next August 10).
    const nextExpiry = getRenewalCycleEnd(now);

    const updateData = {
      membershipStatus: 'active',
      renewalConfirmedAt: now.toISOString(),
      lastRenewalDate: now.toISOString(),
      membershipStartDate: memberData.membershipStartDate || now.toISOString(),
      membershipEndDate: nextExpiry ? nextExpiry.toISOString() : null,
      renewalReference: renewalReference || memberData.renewalReference || null,
      renewalNotes: notes || memberData.renewalNotes || null,
      renewalAmount: memberData.renewalAmount || RENEWAL_FEE_KES,
      lastUpdated: now.toISOString()
    };

    await updateDoc(memberRef, updateData);

    sendRenewalConfirmedEmail({ ...memberData, ...updateData, id }).catch((err) => {
      console.error('Failed to send renewal confirmed email:', err);
    });

    return res.json({ success: true, message: 'Membership renewal confirmed successfully.' });
  } catch (error) {
    console.error('Error confirming renewal:', error);
    return res.status(500).json({ error: 'Failed to confirm membership renewal.' });
  }
});

// Update payment status (registrar and admin only)
router.patch('/:id/payment', verifyRole(['registrar', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body || {};

    if (!['pending', 'confirmed', 'rejected'].includes(paymentStatus)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    const memberRef = doc(db, 'members', id);
    const memberDoc = await getDoc(memberRef);

    if (!memberDoc.exists()) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const memberData = memberDoc.data();
    const previousStatus = memberData.paymentStatus;
    const now = new Date();

    const updateData = {
      paymentStatus,
      lastUpdated: now.toISOString()
    };

    if (paymentStatus === 'confirmed') {
      if (!memberData.memberNumber && (memberData.course || memberData.areaOfInterest)) {
        updateData.memberNumber = await generateMemberNumber(memberData);
      }

      // Record the membership term this payment activates. A member's term is
      // anchored on their registration (join) date, so the term runs to the
      // end of the cycle their registration date falls in. paymentConfirmedAt
      // is recorded for auditing only - it does not affect renewal eligibility.
      if (previousStatus !== 'confirmed') {
        updateData.paymentConfirmedAt = now.toISOString();

        if (!memberData.membershipStartDate) {
          updateData.membershipStartDate = memberData.registrationDate || now.toISOString();
        }

        if (!memberData.membershipEndDate) {
          const cycleEnd = getRenewalCycleEnd(memberData.registrationDate || now);
          if (cycleEnd) {
            updateData.membershipEndDate = cycleEnd.toISOString();
          }
        }
      }
    }

    await updateDoc(memberRef, updateData);

    if (previousStatus !== paymentStatus) {
      const updatedMemberData = { ...memberData, ...updateData };

      if (paymentStatus === 'confirmed') {
        sendPaymentConfirmedEmail(updatedMemberData).catch((err) => {
          console.error('Failed to send payment confirmed email:', err);
        });
      } else if (paymentStatus === 'rejected') {
        sendPaymentRejectedEmail(updatedMemberData).catch((err) => {
          console.error('Failed to send payment rejected email:', err);
        });
      }
    }

    return res.json({ success: true, message: 'Payment status updated successfully' });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return res.status(500).json({ error: 'Failed to update payment status' });
  }
});

// Delete member (admin only)
router.delete('/:id', verifyRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const memberRef = doc(db, 'members', id);
    await deleteDoc(memberRef);

    return res.json({ success: true, message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Error deleting member:', error);
    return res.status(500).json({ error: 'Failed to delete member' });
  }
});

module.exports = router;