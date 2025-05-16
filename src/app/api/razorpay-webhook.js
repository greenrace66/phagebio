// /src/app/api/razorpay-webhook.js
// Endpoint: POST /api/razorpay-webhook
// Handles Razorpay webhooks for payment status updates. Secure with a webhook secret.

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// TODO: Store these securely in environment variables
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * POST /api/razorpay-webhook
 * Razorpay sends event payloads here. Validate signature and update DB accordingly.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const webhookBody = JSON.stringify(req.body);
  const signature = req.headers['x-razorpay-signature'];
  // 1. Verify webhook signature
  const expectedSignature = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(webhookBody)
    .digest('hex');
  if (signature !== expectedSignature) {
    return res.status(400).json({ message: 'Invalid webhook signature' });
  }
  // 2. Handle event (e.g., payment.captured, payment.failed)
  const event = req.body.event;
  const payload = req.body.payload;
  if (event === 'payment.captured') {
    // Update transaction status in Supabase
    const payment_id = payload.payment.entity.id;
    await supabase.from('transactions').update({ status: 'captured' }).eq('payment_id', payment_id);
  } else if (event === 'payment.failed') {
    const payment_id = payload.payment.entity.id;
    await supabase.from('transactions').update({ status: 'failed' }).eq('payment_id', payment_id);
  }
  // Add more event types as needed
  res.status(200).json({ received: true });
};
