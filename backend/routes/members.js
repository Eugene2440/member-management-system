const express = require('express');
const { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy } = require('firebase/firestore');
const { db } = require('../config/firebase');
const { verifyToken, verifyRole } = require('../middleware/auth');

const router = express.Router();

// Public route - Member registration
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, course, registrationNumber, paymentReference, memberType, areaOfInterest } = req.body;
        
        // Validate required fields based on member type
        if (!name || !email || !phone || !paymentReference) {
            return res.status(400).json({ error: 'Name, email, phone, and payment reference are required' });
        }
        
        if (memberType === 'student' && !course) {
            return res.status(400).json({ error: 'Course is required for student registration' });
        }
        
        if (memberType === 'non-student' && !areaOfInterest) {
            return res.status(400).json({ error: 'Area of interest is required for non-student registration' });
        }
        
        // Check for duplicate email
        const emailQuery = query(collection(db, 'members'), where('email', '==', email.toLowerCase().trim()));
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
            return res.status(400).json({ error: 'A member with this email address is already registered' });
        }
        

        
        // Generate member number with course format when payment is confirmed
        const memberNumber = null; // Will be generated when payment is confirmed
        
        // Create member object based on type
        const memberData = {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone,
            paymentReference: paymentReference.trim(),
            memberNumber,
            memberType: memberType || 'student',
            membershipType: 'pending', // Default type, admin will assign proper type
            paymentStatus: 'pending',
            registrationDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        // Add fields specific to member type
        if (memberType === 'student') {
            memberData.course = course.trim();
            memberData.registrationNumber = registrationNumber ? registrationNumber.trim() : null;
            memberData.department = null; // Will be set by admin if needed
        } else {
            memberData.areaOfInterest = areaOfInterest.trim();
        }
        
        // Add to Firebase
        const docRef = await addDoc(collection(db, 'members'), memberData);
        
        res.status(201).json({ 
            success: true, 
            message: 'Member registered successfully',
            memberId: docRef.id,
            memberNumber: memberNumber
        });
    } catch (error) {
        console.error('Error registering member:', error);
        res.status(500).json({ error: 'Failed to register member' });
    }
});

// Helper function to generate member number based on member type
async function generateMemberNumber(memberData) {
    try {
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
        
        // Get all members to find the highest member number globally
        const membersQuery = query(collection(db, 'members'));
        const membersSnapshot = await getDocs(membersQuery);
        
        let nextNumber = 1;
        const existingNumbers = [];
        
        membersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.memberNumber) {
                const parts = data.memberNumber.split('/');
                if (parts.length >= 3) {
                    const num = parseInt(parts[parts.length - 1]);
                    if (!isNaN(num)) {
                        existingNumbers.push(num);
                    }
                }
            }
        });
        
        if (existingNumbers.length > 0) {
            nextNumber = Math.max(...existingNumbers) + 1;
        }
        
        // Generate member number based on type
        if (memberData.memberType === 'non-student') {
            const courseAbbr = courseMapping[memberData.areaOfInterest] || 'GEN';
            return `AECAS/ASS/${courseAbbr}/${nextNumber.toString().padStart(3, '0')}`;
        } else {
            const courseAbbr = courseMapping[memberData.course] || 'GEN';
            return `AECAS/${courseAbbr}/${nextNumber.toString().padStart(3, '0')}`;
        }
    } catch (error) {
        console.error('Error generating member number:', error);
        const timestamp = Date.now().toString().slice(-3);
        return memberData.memberType === 'non-student' ? 
            `AECAS/ASS/GEN/${timestamp}` : 
            `AECAS/GEN/${timestamp}`;
    }
}



// Protected routes - Require authentication
router.use(verifyToken);

// Get all members (all admin roles)
router.get('/', verifyRole(['registrar', 'treasurer', 'admin']), async (req, res) => {
    try {
        const { search, paymentStatus, membershipType } = req.query;
        
        let q = collection(db, 'members');
        
        // Apply filters if provided
        if (paymentStatus) {
            q = query(q, where('paymentStatus', '==', paymentStatus));
        }
        
        if (membershipType) {
            q = query(q, where('membershipType', '==', membershipType));
        }
        
        // Order by registration date (newest first)
        q = query(q, orderBy('registrationDate', 'desc'));
        
        const querySnapshot = await getDocs(q);
        const members = [];
        
        querySnapshot.forEach((doc) => {
            const memberData = { id: doc.id, ...doc.data() };
            
            // Apply search filter on client side (Firebase doesn't support full-text search)
            if (search) {
                const searchLower = search.toLowerCase();
                const nameMatch = memberData.name?.toLowerCase().includes(searchLower);
                const emailMatch = memberData.email?.toLowerCase().includes(searchLower);
                const phoneMatch = memberData.phone?.includes(search);
                
                if (nameMatch || emailMatch || phoneMatch) {
                    members.push(memberData);
                }
            } else {
                members.push(memberData);
            }
        });
        
        res.json({ success: true, members });
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

// Update member details (registrar and admin only)
router.put('/:id', verifyRole(['registrar', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };
        
        // Add last updated timestamp
        updateData.lastUpdated = new Date().toISOString();
        
        // Remove fields that shouldn't be updated
        delete updateData.id;
        delete updateData.registrationDate;
        
        // If course/area of interest is being updated, regenerate member number for confirmed members
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
        
        res.json({ success: true, message: 'Member updated successfully' });
    } catch (error) {
        console.error('Error updating member:', error);
        res.status(500).json({ error: 'Failed to update member' });
    }
});

// Update payment status (treasurer and admin only)
router.patch('/:id/payment', verifyRole(['treasurer', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentStatus } = req.body;
        
        if (!['pending', 'confirmed', 'rejected'].includes(paymentStatus)) {
            return res.status(400).json({ error: 'Invalid payment status' });
        }
        
        const memberRef = doc(db, 'members', id);
        const updateData = { 
            paymentStatus,
            lastUpdated: new Date().toISOString()
        };
        
        // Generate member number when payment is confirmed
        if (paymentStatus === 'confirmed') {
            const memberDoc = await getDoc(memberRef);
            if (memberDoc.exists()) {
                const memberData = memberDoc.data();
                if (!memberData.memberNumber && (memberData.course || memberData.areaOfInterest)) {
                    updateData.memberNumber = await generateMemberNumber(memberData);
                }
            }
        }
        
        await updateDoc(memberRef, updateData);
        
        res.json({ success: true, message: 'Payment status updated successfully' });
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({ error: 'Failed to update payment status' });
    }
});

// Delete member (admin only)
router.delete('/:id', verifyRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        
        const memberRef = doc(db, 'members', id);
        await deleteDoc(memberRef);
        
        res.json({ success: true, message: 'Member deleted successfully' });
    } catch (error) {
        console.error('Error deleting member:', error);
        res.status(500).json({ error: 'Failed to delete member' });
    }
});

module.exports = router;
