const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    
    // ============ ORDER DETAILS ============
    service: { type: String, required: true },
    clothesType: { 
        type: String, 
        enum: ['Regular', 'Delicate', 'Heavy', 'Silk', 'Wool', 'Blankets'], 
        default: 'Regular' 
    },
    weight: { type: Number, default: 0, min: 0 },
    washStyle: { 
        type: String, 
        enum: ['Standard', 'Eco', 'Heavy Duty', 'Delicate', 'Hand Wash'], 
        default: 'Standard' 
    },
    includeDryer: { type: Boolean, default: false },
    includeIroning: { type: Boolean, default: false },
    includeFolding: { type: Boolean, default: false },
    specialInstructions: { type: String, default: '' },
    
    // ============ PRICING ============
    price: { type: Number, default: 0 },
    priceBreakdown: {
        basePrice: { type: Number, default: 0 },
        weightPrice: { type: Number, default: 0 },
        dryerPrice: { type: Number, default: 0 },
        ironingPrice: { type: Number, default: 0 },
        foldingPrice: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    
    // ============ STATUS ============
    status: { 
        type: String, 
        enum: ['Pending', 'Processing', 'Completed', 'Ready', 'Picked Up'], 
        default: 'Pending' 
    },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    estimatedTime: { type: Number, default: 30 }, // in minutes
    
    // ============ PAYMENT ============
    paymentStatus: { 
        type: String, 
        enum: ['Unpaid', 'Paid', 'Partial'], 
        default: 'Unpaid' 
    },
    paymentMethod: { 
        type: String, 
        enum: ['Cash', 'Card', 'QR', 'Online', 'Bank Transfer'], 
        default: 'Cash' 
    },
    paymentDate: Date,
    
    // ============ ASSIGNMENT ============
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    
    // ============ FEEDBACK ============
    feedback: { type: Number, min: 1, max: 5 },
    feedbackComment: String,
    
    // ============ TIMESTAMPS ============
    completedAt: Date,
    pickedUpAt: Date,
    notes: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);