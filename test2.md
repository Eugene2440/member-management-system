const express = require('express');
const {
    collection,
    addDoc,
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
const { sendWelcomeEmail, sendPaymentConfirmedEmail, sendPaymentRejectedEmail } = require('../services/email');

const router = express.Router();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const publicRateLimitStore = new Map();

function getClientIp(req) {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
        return forwardedFor.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
}

function createRateLimiter({ windowMs, maxRequests }) {
    return function rateLimiter(req, res, next) {
        const now = Date.now();
        const clientIp = getClientIp(req);
        const timestamps = publicRateLimitStore.get(clientIp) || [];
        const validTimestamps = timestamps.filter((timestamp) => now - timestamp < windowMs);

        if (validTimestamps.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                error: 'Too many requests. Please try again shortly.'
            });
        }

        validTimestamps.push(now);
        publicRateLimitStore.set(clientIp, validTimestamps);

        if (publicRateLimitStore.size > 1000) {
            for (const [key, entries] of publicRateLimitStore.entries()) {
                const activeEntries = entries.filter((timestamp) => now - timestamp < windowMs);
                if (activeEntries.length === 0) {
                    publicRateLimitStore.delete(key);
                } else {
                    publicRateLimitStore.set(key, activeEntries);
                }
            }
        }

        next();
    };
}

const publicLookupRateLimiter = createRateLimiter({
    windowMs: RATE_LIMIT_WINDOW_MS,
    maxRequests: RATE_LIMIT_MAX_REQUESTS
});

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
        URP: 'URP',
        URD: 'URD',
        CE: 'CE',
        CM: 'CM',
        QS: 'QS',
        CT: 'CT',
        RE: 'RE',
        EEE: 'EEE',
        ME: 'ME',
        AAE: 'AAE',
        GE: 'GE',
        GIC: 'GIC',
        GIN: 'GIN',
        SV: 'SV',
        LA: 'LA',
        CHE: 'CHE',
        ARC: 'ARC'
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
    try {
        return await runTransaction(db, async (transaction) => {
            return generateMemberNumberInTransaction(transaction, memberData);
        });
    } catch (error) {
        console.error('Error generating member number:', error);
        const timestamp = Date.now().toString().slice(-3);
        return memberData.memberType === 'non-student'
            ? `AECAS/ASS/GEN/${timestamp}`
            : `AECAS/GEN/${timestamp}`;
    }
}

function isWithinAnnualRenewalWindow(memberData) {
    const now = new Date();
    const annualCutoff = new Date(now.getFullYear(), 7, 10, 23, 59, 59, 999);

    const memberJoinDate = memberData.registrationDate ? new Date(memberData.registrationDate) : null;
    const memberLastRenewal = memberData.lastRenewalDate ? new Date(memberData.lastRenewalDate) : null;

    if (!memberJoinDate && !memberLastRenewal) {
        return true;
    }

    const referenceDate = memberLastRenewal && memberLastRenewal > new Date(0) ? memberLastRenewal : memberJoinDate;
    if (!referenceDate || Number.isNaN(referenceDate.getTime())) {
        return true;
    }

    return referenceDate <= annualCutoff;
}

function isRenewalEligible(memberData) {
    if (!memberData) return false;
    if (memberData.paymentStatus !== 'confirmed') return false;
    if (memberData.membershipStatus === 'renewal_pending') return false;
    if (memberData.membershipStatus === 'renewal_confirmed') return false;
    return isWithinAnnualRenewalWindow(memberData);
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
        return await runTransaction(db, async (transaction) => {
            const candidateMap = new Map();

            for (const fieldName of providedFields) {
                const queryValue = suppliedValues[fieldName];
                if (!queryValue) continue;

                const lookupQuery = query(collection(db, 'members'), where(fieldName, '==', fieldName === 'email' ? normalizeEmail(queryValue) : fieldName === 'phone' ? normalizePhone(queryValue) : queryValue));
                const snapshot = await transaction.get(lookupQuery);

                snapshot.forEach((memberDoc) => {
                    const member = { id: memberDoc.id, ...memberDoc.data() };
                    const currentEntry = candidateMap.get(memberDoc.id) || { member, matchCount: 0 };
                    currentEntry.matchCount += 1;
                    candidateMap.set(memberDoc.id, currentEntry);
                });
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
        });
    } catch (error) {
        console.error('Error finding member by identifiers:', error);
        return {
            member: null,
            reason: 'We could not look up the member right now. Please try again.'
        };
    }
}

// ============ PUBLIC ROUTES ============

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

        console.log(`Email preferences updated for ${normalizedEmail}:`, nextPreferences);
        return res.json({ success: true, message: 'Preferences updated successfully' });
    } catch (error) {
        console.error('Error updating preferences:', error);
        return res.status(500).json({ error: 'Failed to update preferences' });
    }
});

// Member registration
router.post('/register', async (req, res) => {
    try {
        const requestBody = req.body || {};
        const {
            name,
            email,
            phone,
            course,
            registrationNumber,
            paymentReference,
            memberType,
            areaOfInterest,
            consent
        } = requestBody;

        if (!name || !email || !phone || !paymentReference) {
            return res.status(400).json({ error: 'Name, email, phone, and payment reference are required' });
        }

        if (!consent) {
            return res.status(400).json({ error: 'You must agree to the Terms of Service and Privacy Policy' });
        }

        const normalizedEmail = normalizeEmail(email);
        const normalizedPhone = normalizePhone(phone);
        const normalizedPaymentReference = String(paymentReference).trim();

        if (!normalizedEmail || !normalizedPhone || !normalizedPaymentReference) {
            return res.status(400).json({ error: 'Email, phone and payment reference are invalid' });
        }

        const resolvedMemberType = memberType === 'non-student' ? 'non-student' : 'student';

        if (resolvedMemberType === 'student' && !course) {
            return res.status(400).json({ error: 'Course is required for student registration' });
        }

        if (resolvedMemberType === 'non-student' && !areaOfInterest) {
            return res.status(400).json({ error: 'Area of interest is required for non-student registration' });
        }

        const memberData = {
            name: String(name).trim(),
            email: normalizedEmail,
            phone: normalizedPhone,
            paymentReference: normalizedPaymentReference,
            memberType: resolvedMemberType,
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

        if (resolvedMemberType === 'student') {
            memberData.course = String(course).trim();
            memberData.registrationNumber = registrationNumber ? String(registrationNumber).trim() : null;
            memberData.department = null;
        } else {
            memberData.areaOfInterest = String(areaOfInterest).trim();
        }

        const memberRef = doc(collection(db, 'members'));
        const memberNumber = await runTransaction(db, async (transaction) => {
            const emailQuery = query(collection(db, 'members'), where('email', '==', normalizedEmail));
            const phoneQuery = query(collection(db, 'members'), where('phone', '==', normalizedPhone));
            const paymentReferenceQuery = query(
                collection(db, 'members'),
                where('paymentReference', '==', normalizedPaymentReference)
            );

            const [emailSnapshot, phoneSnapshot, paymentReferenceSnapshot] = await Promise.all([
                transaction.get(emailQuery),
                transaction.get(phoneQuery),
                transaction.get(paymentReferenceQuery)
            ]);

            if (!emailSnapshot.empty) {
                throw new Error('A member with this email address is already registered');
            }

            if (!phoneSnapshot.empty) {
                throw new Error('A member with this phone number is already registered');
            }

            if (!paymentReferenceSnapshot.empty) {
                throw new Error('This payment reference has already been used');
            }

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
            amount: 100,
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
        const { memberNumber, email, phone, paymentReference } = requestBody;

        if (!paymentReference) {
            return res.status(400).json({ error: 'Payment reference is required for renewal.' });
        }

        const result = await findMemberByIdentifiers({ memberNumber, email, phone });
        if (!result.member) {
            return res.status(404).json({ success: false, error: result.reason || 'No matching member was found.' });
        }

        const memberData = result.member;
        if (!isRenewalEligible(memberData)) {
            return res.status(400).json({ error: 'This member is not eligible for annual renewal at the moment.' });
        }

        if (memberData.membershipStatus === 'renewal_pending') {
            return res.status(409).json({ error: 'This member already has a renewal request pending admin review.' });
        }

        const memberRef = doc(db, 'members', memberData.id);
        const updatedMember = {
            membershipStatus: 'renewal_pending',
            renewalRequestedAt: new Date().toISOString(),
            renewalReference: String(paymentReference).trim(),
            renewalAmount: 100,
            lastUpdated: new Date().toISOString()
        };

        await updateDoc(memberRef, updatedMember);

        return res.json({
            success: true,
            message: 'Annual membership renewal request submitted successfully. Please wait for admin confirmation.',
            amount: 100,
            memberId: memberData.id
        });
    } catch (error) {
        console.error('Error creating renewal request:', error);
        return res.status(500).json({ error: 'Failed to submit renewal request.' });
    }
});

// Protected routes - Require authentication
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
                if (memberData.paymentStatus === 'confirmed') {
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
        const baseExpiryDate = memberData.membershipEndDate ? new Date(memberData.membershipEndDate) : new Date();
        const nextExpiry = new Date(baseExpiryDate);
        nextExpiry.setFullYear(nextExpiry.getFullYear() + 1);

        const updateData = {
            membershipStatus: 'active',
            renewalConfirmedAt: now.toISOString(),
            lastRenewalDate: now.toISOString(),
            membershipStartDate: memberData.membershipStartDate || now.toISOString(),
            membershipEndDate: nextExpiry.toISOString(),
            renewalReference: renewalReference || memberData.renewalReference || null,
            renewalNotes: notes || memberData.renewalNotes || null,
            renewalAmount: memberData.renewalAmount || 100,
            lastUpdated: now.toISOString()
        };

        await updateDoc(memberRef, updateData);

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

        const updateData = {
            paymentStatus,
            lastUpdated: new Date().toISOString()
        };

        if (paymentStatus === 'confirmed') {
            if (!memberData.memberNumber && (memberData.course || memberData.areaOfInterest)) {
                updateData.memberNumber = await generateMemberNumber(memberData);
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
