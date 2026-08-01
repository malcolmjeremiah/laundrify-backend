const express = require('express');
const router = express.Router();
const Staff = require('../models/Staff');
const { auth, adminOnly } = require('../middleware/auth');

// ==================== GET ALL STAFF ====================
router.get('/', auth, adminOnly, async (req, res) => {
    try {
        const staff = await Staff.find()
            .populate('userId', 'name email')
            .sort({ name: 1 });
        res.json(staff);
    } catch (error) {
        console.error('Get staff error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== GET ACTIVE STAFF ====================
router.get('/active', auth, adminOnly, async (req, res) => {
    try {
        const staff = await Staff.find({ isActive: true })
            .populate('userId', 'name email')
            .sort({ name: 1 });
        res.json(staff);
    } catch (error) {
        console.error('Get active staff error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== CREATE STAFF ====================
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { name, email, phone, shift, userId } = req.body;
        
        // ✅ Email validation
        if (!email || !email.includes('@') || !email.includes('.')) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }
        
        // ✅ Phone number validation (only numbers, +, -, spaces, parentheses)
        if (phone && !/^[0-9+\-\s()]*$/.test(phone)) {
            return res.status(400).json({ error: 'Phone number contains invalid characters. Use only numbers, +, -, or spaces.' });
        }
        
        // Check if staff exists
        const existing = await Staff.findOne({ email });
        if (existing) {
            return res.status(400).json({ error: 'Staff with this email already exists' });
        }
        
        const staff = new Staff({
            name,
            email,
            phone: phone || '',
            shift: shift || 'Flexible',
            userId: userId || null,
            isActive: true
        });
        
        await staff.save();
        res.status(201).json(staff);
    } catch (error) {
        console.error('Create staff error:', error);
        res.status(400).json({ error: error.message });
    }
});

// ==================== UPDATE STAFF ====================
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const { name, email, phone, shift, isActive } = req.body;
        
        // ✅ Email validation
        if (email && (!email.includes('@') || !email.includes('.'))) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }
        
        // ✅ Phone number validation
        if (phone && !/^[0-9+\-\s()]*$/.test(phone)) {
            return res.status(400).json({ error: 'Phone number contains invalid characters. Use only numbers, +, -, or spaces.' });
        }
        
        const updated = await Staff.findByIdAndUpdate(
            req.params.id,
            { name, email, phone, shift, isActive },
            { new: true }
        );
        
        if (!updated) {
            return res.status(404).json({ error: 'Staff not found' });
        }
        
        res.json(updated);
    } catch (error) {
        console.error('Update staff error:', error);
        res.status(400).json({ error: error.message });
    }
});

// ==================== DELETE STAFF ====================
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const deleted = await Staff.findByIdAndDelete(req.params.id);
        
        if (!deleted) {
            return res.status(404).json({ error: 'Staff not found' });
        }
        
        res.json({ success: true, message: 'Staff deleted successfully' });
    } catch (error) {
        console.error('Delete staff error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
