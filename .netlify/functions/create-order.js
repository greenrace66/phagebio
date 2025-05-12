// netlify/functions/create-order.js
// Netlify Function: POST /.netlify/functions/create-order
// Creates a Razorpay order for the premium plan and returns the order details to the frontend.

const Razorpay = require('razorpay');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_YourTestKeyHere';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'YourTestSecretHere';

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    const { plan } = body;
    // For demo, fixed price for premium plan
    const amount = 1900 * 100; // INR 1900 in paise
    const currency = 'INR';
    const receipt = `receipt_premium_${Date.now()}`;
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
      payment_capture: 1,
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ order })
    };
  } catch (err) {
    console.error('Error creating Razorpay order:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to create order' })
    };
  }
};
