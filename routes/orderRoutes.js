const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { auth, adminOnly } = require('../middleware/auth');

const { sendOrderCompleteEmail } = require('../utils/sendEmails');

router.get('/', auth, adminOnly, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/my-orders', auth, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Get my orders error:', error);
        res.status(500).json({ error: error.message });
    }
});

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
            price
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
            price: price || 10,
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

router.put('/:id/status', auth, adminOnly, async (req, res) => {
    try {
        const { status } = req.body;
        console.log(`📝 Updating order ${req.params.id} to status: ${status}`);

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
            console.log(`📧 Order ${req.params.id} completed! Sending email...`);
            await sendOrderCompleteEmail(updated);
        }

        res.json(updated);
    } catch (error) {
        console.error('Update status error:', error);
        res.status(400).json({ error: error.message });
    }
});

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
