const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const { auth, adminOnly } = require('../middleware/auth');

// Get all inventory (Admin only)
router.get('/', auth, adminOnly, async (req, res) => {
    try {
        const inventory = await Inventory.find().sort({ category: 1, name: 1 });
        res.json(inventory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get low stock items (Admin only)
router.get('/low-stock', auth, adminOnly, async (req, res) => {
    try {
        const lowStock = await Inventory.find({
            $expr: { $lte: ['$quantity', '$minQuantity'] }
        });
        res.json(lowStock);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create inventory item (Admin only)
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { name, quantity, unit, minQuantity, category } = req.body;
        
        const existing = await Inventory.findOne({ name });
        if (existing) {
            return res.status(400).json({ error: 'Item already exists' });
        }
        
        const item = new Inventory({
            name,
            quantity: quantity || 0,
            unit: unit || 'kg',
            minQuantity: minQuantity || 5,
            category: category || 'other'
        });
        
        await item.save();
        res.status(201).json(item);
    } catch (error) {
        console.error('Create inventory error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Update inventory (Admin only)
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const { quantity, minQuantity, name, unit, category } = req.body;
        
        const updated = await Inventory.findByIdAndUpdate(
            req.params.id,
            {
                name,
                quantity,
                unit,
                minQuantity,
                category,
                updatedAt: new Date()
            },
            { new: true }
        );
        
        if (!updated) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        res.json(updated);
    } catch (error) {
        console.error('Update inventory error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Update quantity only (Admin only)
router.patch('/:id/quantity', auth, adminOnly, async (req, res) => {
    try {
        const { quantity } = req.body;
        
        const updated = await Inventory.findByIdAndUpdate(
            req.params.id,
            { quantity, updatedAt: new Date() },
            { new: true }
        );
        
        if (!updated) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        res.json(updated);
    } catch (error) {
        console.error('Update quantity error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete inventory (Admin only)
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const deleted = await Inventory.findByIdAndDelete(req.params.id);
        
        if (!deleted) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        res.json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Delete inventory error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;