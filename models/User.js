const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['admin', 'customer'],
        default: 'customer'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// ============ FIXED: NO next() ISSUE ============
UserSchema.pre('save', function() {
    const user = this;
    
    if (!user.isModified('password')) {
        return;
    }
    
    const salt = bcrypt.genSaltSync(10);
    user.password = bcrypt.hashSync(user.password, salt);
});

// ============ COMPARE PASSWORD ============
UserSchema.methods.comparePassword = function(candidatePassword) {
    return bcrypt.compareSync(candidatePassword, this.password);
};

// ============ REMOVE PASSWORD FROM JSON ============
UserSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    return user;
};

module.exports = mongoose.model('User', UserSchema);