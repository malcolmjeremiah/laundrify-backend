const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: '' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    shift: { 
        type: String, 
        enum: ['Morning', 'Afternoon', 'Evening', 'Flexible'], 
        default: 'Flexible' 
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Staff', StaffSchema);