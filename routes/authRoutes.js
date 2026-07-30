const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ==================== REGISTER ====================
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // ✅ FIX: Only admin@laundrify.com can be admin
        let assignedRole = 'customer';
        if (email === 'admin@laundrify.com') {
            assignedRole = 'admin';
        }
        
        const user = new User({ 
            name, 
            email, 
            password, 
            role: assignedRole
        });
        await user.save();
        
        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET || 'laundrify-super-secret-key'
        );
        
        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(400).json({ error: error.message });
    }
});

// ==================== LOGIN ====================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const isMatch = user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET || 'laundrify-super-secret-key'
        );
        
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ error: error.message });
    }
});

// ==================== GET CURRENT USER ====================
router.get('/me', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'laundrify-super-secret-key');
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// ==================== UPDATE PROFILE ====================
router.put('/profile', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'laundrify-super-secret-key');
        const userId = decoded.id;
        
        const { name, email } = req.body;
        
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }
        
        const existingUser = await User.findOne({ 
            email, 
            _id: { $ne: userId } 
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }
        
        const updated = await User.findByIdAndUpdate(
            userId,
            { name, email },
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!updated) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(updated);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;