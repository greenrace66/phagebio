// /src/app/api/verify-payment.js
// Endpoint: POST /api/verify-payment
// Verifies Razorpay payment signature, stores transaction in Supabase, and activates subscription.

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// TODO: Store these securely in environment variables
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'YourTestSecretHere';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * POST /api/verify-payment
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan }
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
    // 1. Signature verification
    const generated_signature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
    // 2. Store transaction in Supabase
    const { data, error } = await supabase.from('transactions').insert([
      {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        plan,
        status: 'success',
        created_at: new Date().toISOString(),
      },
    ]);
    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    // 3. Activate subscription logic (customize as needed)
    // Example: update user's subscription status in Supabase
    // await supabase.from('users').update({ subscription: 'premium' }).eq('id', user_id);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Payment verification error:', err);
    return res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
};
