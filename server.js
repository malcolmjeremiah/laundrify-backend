const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

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
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);

// ✅ HARDCODED Mailgun credentials (Render fix)
const mg = mailgun.client({
    username: 'api',
    key: '4a7647ab455afc6d92c6b103f1a1f10d-2fd911e3-cfc3b73a'
});

const sendOrderCompleteEmail = async (order) => {
    try {
        const data = await mg.messages.create(
            'sandboxd6f255f1c6704b968c50d1abc89cdf34.mailgun.org',
            {
                from: 'Laundrify <mailgun@sandboxd6f255f1c6704b968c50d1abc89cdf34.mailgun.org>',
                to: [order.customerEmail],
                subject: `Order #${order._id.toString().slice(-4)} - Ready for Pickup`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafafa;">
                        <div style="text-align: center; padding-bottom: 10px; border-bottom: 2px solid #7c3aed;">
                            <span style="font-size: 18px; font-weight: 700; color: #7c3aed;">Laundrify</span>
                        </div>
                        <div style="padding: 12px 0;">
                            <p style="color: #0f172a; font-size: 14px; margin: 0 0 6px 0;">Hello ${order.customerName},</p>
                            <p style="color: #475569; font-size: 13px; margin: 0 0 10px 0;">Your order is ready for pickup.</p>
                            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px;">
                                <p style="margin: 2px 0; color: #0f172a; font-size: 12px;"><strong>Order:</strong> #${order._id.toString().slice(-4)}</p>
                                <p style="margin: 2px 0; color: #0f172a; font-size: 12px;"><strong>Service:</strong> ${order.service}</p>
                                <p style="margin: 2px 0; color: #0f172a; font-size: 12px;"><strong>Weight:</strong> ${order.weight || 0} kg</p>
                                <p style="margin: 2px 0; color: #0f172a; font-size: 12px;"><strong>Price:</strong> RM${order.price || 0}</p>
                            </div>
                            <p style="color: #94a3b8; font-size: 11px; margin: 0;">Thank you for choosing Laundrify.</p>
                        </div>
                        <div style="text-align: center; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8;">
                            <p style="margin: 0;">Automated message. Do not reply.</p>
                        </div>
                    </div>
                `
            }
        );
        console.log(`✅ Email sent to ${order.customerEmail} - ID: ${data.id}`);
    } catch (error) {
        console.error('❌ Email failed:', error.message);
    }
};

// ✅ Test email on startup
const testEmail = async () => {
    try {
        const data = await mg.messages.create(
            'sandboxd6f255f1c6704b968c50d1abc89cdf34.mailgun.org',
            {
                from: 'Laundrify <mailgun@sandboxd6f255f1c6704b968c50d1abc89cdf34.mailgun.org>',
                to: ['malcolmtechspace@gmail.com'],
                subject: '✅ Laundrify Email Test (Mailgun)',
                html: '<p>Your Mailgun integration is working! 🎉</p>'
            }
        );
        console.log('✅ Mailgun email transporter is ready!');
        console.log(`📧 Test email sent to malcolmtechspace@gmail.com - ID: ${data.id}`);
    } catch (error) {
        console.error('❌ Mailgun email transporter failed:', error.message);
    }
};
testEmail();

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

module.exports = { sendOrderCompleteEmail };
