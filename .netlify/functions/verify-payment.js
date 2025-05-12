// netlify/functions/verify-payment.js
// Netlify Function: POST /.netlify/functions/verify-payment
// Verifies Razorpay payment signature, stores transaction in Supabase, and activates subscription.

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'YourTestSecretHere';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, user_id } = body;
    // 1. Signature verification
    const generated_signature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    if (generated_signature !== razorpay_signature) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Invalid payment signature' })
      };
    }
    // 2. Store transaction in Supabase
    const { data, error } = await supabase.from('transactions').insert([
      {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        plan,
        user_id: user_id || null,
        status: 'success',
        created_at: new Date().toISOString(),
      },
    ]);
    if (error) {
      console.error('Supabase insert error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, message: 'Database error' })
      };
    }
    // 3. Activate subscription logic (customize as needed)
    // Example: update user's subscription status in Supabase
    // await supabase.from('profiles').update({ subscription: 'premium' }).eq('id', user_id);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error('Payment verification error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Payment verification failed' })
    };
  }
};
