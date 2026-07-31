const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ==================== DEBUG: CONFIRM ENV VARS LOADED ====================
console.log('RESEND KEY LOADED:', process.env.RESEND_API_KEY ? 'YES ✅' : 'NO ❌ - MISSING');
console.log('FROM EMAIL:', process.env.FROM_EMAIL || 'MISSING ❌');

// ==================== ROUTES ====================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));

// ==================== TEST ROUTE ====================
app.get('/', (req, res) => {
    res.json({ message: 'Laundrify API is running!' });
});

// ==================== AUTO-STATUS TIMER & EMAIL ====================
const Order = require('./models/Order');
const { sendOrderCompleteEmail } = require('./utils/sendEmails');

// Auto-complete timer
setInterval(async () => {
    try {
        const processingOrders = await Order.find({ status: 'Processing' });
        for (let order of processingOrders) {
            const processingTime = Date.now() - new Date(order.updatedAt).getTime();
            const estimatedMs = (order.estimatedTime || 30) * 60 * 1000;
            if (processingTime > estimatedMs) {
                order.status = 'Completed';
                order.completedAt = new Date();
                await order.save();
                console.log(`✅ Order #${order._id.toString().slice(-4)} Auto-Completed!`);
                await sendOrderCompleteEmail(order);
            }
        }
    } catch (error) {
        console.error('❌ Automation error:', error);
    }
}, 10000);

// ==================== MONGODB CONNECTION ====================
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/laundrify')
    .then(() => {
        console.log('✅ Connected to MongoDB');
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log('🤖 Auto-Status Timer running (checks every 10s)');
            console.log('📧 Email notifications enabled');
        });
    })
    .catch(err => {
        console.error('❌ DB Connection failed:', err.message);
    });
