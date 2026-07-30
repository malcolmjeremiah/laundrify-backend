const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { auth, adminOnly } = require('../middleware/auth');
const nodemailer = require('nodemailer');

// ==================== EMAIL TRANSPORTER ====================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'malcolmtechspace@gmail.com',
        pass: 'ddnl cjxl oujn cnpg'
    }
});

// ==================== SEND EMAIL HELPER ====================
const sendOrderCompleteEmail = async (order) => {
    try {
        await transporter.sendMail({
            from: `"Laundrify" <malcolmtechspace@gmail.com>`,
            to: order.customerEmail,
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
        });
        console.log(`📧 Email sent to ${order.customerEmail}`);
    } catch (error) {
        console.error('❌ Email failed:', error.message);
    }
};

// ==================== GET ALL ORDERS ====================
router.get('/', auth, adminOnly, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== GET USER'S ORDERS ====================
router.get('/my-orders', auth, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Get my orders error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== CREATE ORDER ====================
router.post('/', auth, async (req, res) => {
    try {
        const {
            service,
            clothesType,
            weight,
            washStyle,
            includeDryer,
            includeIroning,
            includeFolding,
            specialInstructions,
            priority,
            estimatedTime,
            price  // ✅ RECEIVE THE PRICE FROM FRONTEND
        } = req.body;

        if (!service || service.trim() === '') {
            return res.status(400).json({ error: 'Service name is required' });
        }

        const order = new Order({
            service: service.trim(),
            clothesType: clothesType || 'Regular',
            weight: weight || 0,
            washStyle: washStyle || 'Standard',
            includeDryer: includeDryer || false,
            includeIroning: includeIroning || false,
            includeFolding: includeFolding || false,
            specialInstructions: specialInstructions || '',
            priority: priority || 'Medium',
            price: price || 10,  // ✅ USE THE CALCULATED PRICE
            estimatedTime: estimatedTime || 30,
            userId: req.user._id,
            customerName: req.user.name,
            customerEmail: req.user.email,
            status: 'Pending',
            paymentStatus: 'Unpaid'
        });

        await order.save();
        console.log(`✅ Order created: ${order._id} - Price: RM${order.price}`);

        res.status(201).json(order);

    } catch (error) {
        console.error('Create order error:', error);
        res.status(400).json({ error: error.message });
    }
});

// ==================== UPDATE ORDER STATUS ====================
router.put('/:id/status', auth, adminOnly, async (req, res) => {
    try {
        const { status } = req.body;
        const updated = await Order.findByIdAndUpdate(
            req.params.id,
            {
                status,
                completedAt: status === 'Completed' ? new Date() : undefined,
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (status === 'Completed') {
            await sendOrderCompleteEmail(updated);
        }

        res.json(updated);
    } catch (error) {
        console.error('Update status error:', error);
        res.status(400).json({ error: error.message });
    }
});

// ==================== MARK ORDER AS PAID ====================
router.put('/:id/pay', auth, async (req, res) => {
    try {
        console.log('💰 PAYMENT ENDPOINT HIT!');
        console.log('📦 Order ID:', req.params.id);
        console.log('📝 Payment Method:', req.body.paymentMethod);
        console.log('👤 User ID:', req.user._id);

        const { paymentMethod } = req.body;

        const order = await Order.findOne({
            _id: req.params.id,
            $or: [
                { userId: req.user._id },
                { userId: { $exists: true } }
            ]
        });

        if (!order) {
            console.log('❌ Order not found');
            return res.status(404).json({ error: 'Order not found' });
        }

        order.paymentStatus = 'Paid';
        order.paymentMethod = paymentMethod || 'Cash';
        order.paymentDate = new Date();
        order.updatedAt = new Date();
        await order.save();

        console.log(`✅ Order #${order._id.toString().slice(-4)} marked as PAID via ${order.paymentMethod}`);
        res.json(order);

    } catch (error) {
        console.error('❌ Payment error:', error);
        res.status(400).json({ error: error.message });
    }
});

// ==================== SUBMIT FEEDBACK ====================
router.post('/:id/feedback', auth, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const order = await Order.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.status !== 'Completed') {
            return res.status(400).json({ error: 'Can only rate completed orders' });
        }

        if (order.feedback) {
            return res.status(400).json({ error: 'Already rated this order' });
        }

        order.feedback = rating;
        order.feedbackComment = comment || '';
        await order.save();

        res.json({
            success: true,
            message: 'Feedback submitted!',
            order
        });

    } catch (error) {
        console.error('Feedback error:', error);
        res.status(400).json({ error: error.message });
    }
});

// ==================== GET ORDER STATISTICS ====================
router.get('/stats', auth, adminOnly, async (req, res) => {
    try {
        const total = await Order.countDocuments();
        const pending = await Order.countDocuments({ status: 'Pending' });
        const processing = await Order.countDocuments({ status: 'Processing' });
        const completed = await Order.countDocuments({ status: 'Completed' });

        const ratedOrders = await Order.find({ feedback: { $exists: true, $ne: null } });
        const avgRating = ratedOrders.length > 0
            ? (ratedOrders.reduce((sum, o) => sum + o.feedback, 0) / ratedOrders.length).toFixed(1)
            : 0;

        const totalRevenue = await Order.aggregate([
            { $match: { paymentStatus: 'Paid' } },
            { $group: { _id: null, total: { $sum: '$price' } } }
        ]);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailyOrders = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt'
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            total,
            pending,
            processing,
            completed,
            avgRating: avgRating || 0,
            totalRatings: ratedOrders.length,
            totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
            dailyOrders: dailyOrders || []
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== EXPORT ORDERS AS CSV ====================
router.get('/export/csv', auth, adminOnly, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        let csv = 'Order ID,Service,Status,Customer,Email,Price,Payment,Rating,Date\n';
        orders.forEach(order => {
            csv += `${order._id.toString().slice(-4)},`;
            csv += `"${order.service}",`;
            csv += `${order.status},`;
            csv += `"${order.customerName}",`;
            csv += `"${order.customerEmail}",`;
            csv += `${order.price || 0},`;
            csv += `${order.paymentStatus},`;
            csv += `${order.feedback || 'N/A'},`;
            csv += `${new Date(order.createdAt).toLocaleDateString()}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=laundrify-orders.csv');
        res.send(csv);

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== DELETE ORDER ====================
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const deleted = await Order.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({
            success: true,
            message: 'Order deleted successfully'
        });
    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;