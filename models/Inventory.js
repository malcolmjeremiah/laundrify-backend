const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    unit: { type: String, default: 'kg' },
    minQuantity: { type: Number, default: 5 },
    category: { type: String, enum: ['detergent', 'softener', 'bleach', 'other'], default: 'other' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Inventory', InventorySchema);