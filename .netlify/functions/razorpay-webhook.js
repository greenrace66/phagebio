// netlify/functions/razorpay-webhook.js
// Netlify Function: POST /.netlify/functions/razorpay-webhook
// Handles Razorpay webhooks for payment status updates. Secure with a webhook secret.

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'your-webhook-secret';
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
  const signature = event.headers['x-razorpay-signature'] || event.headers['X-Razorpay-Signature'];
  const webhookBody = event.body;
  // 1. Verify webhook signature
  const expectedSignature = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(webhookBody)
    .digest('hex');
  if (signature !== expectedSignature) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid webhook signature' })
    };
  }
  // 2. Handle event (e.g., payment.captured, payment.failed)
  const body = JSON.parse(webhookBody);
  const eventType = body.event;
  const payload = body.payload;
  if (eventType === 'payment.captured') {
    const payment_id = payload.payment.entity.id;
    await supabase.from('transactions').update({ status: 'captured' }).eq('payment_id', payment_id);
  } else if (eventType === 'payment.failed') {
    const payment_id = payload.payment.entity.id;
    await supabase.from('transactions').update({ status: 'failed' }).eq('payment_id', payment_id);
  }
  // Add more event types as needed
  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};
