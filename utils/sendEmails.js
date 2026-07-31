async function sendOrderCompleteEmail(order) {
    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': process.env.BREVO_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                sender: {
                    name: process.env.FROM_NAME || 'Laundrify',
                    email: process.env.FROM_EMAIL,
                },
                to: [{ email: order.customerEmail, name: order.customerName }],
                subject: `Order #${order._id.toString().slice(-4)} - Ready for Pickup`,
                htmlContent: `
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
                    </div>
                `,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Email failed:', data);
            return { success: false, error: data };
        }

        console.log(`✅ Email sent to ${order.customerEmail} - ID: ${data.messageId}`);
        return { success: true, data };
    } catch (error) {
        console.error('❌ Email failed:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = { sendOrderCompleteEmail };
