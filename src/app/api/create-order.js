// /src/app/api/create-order.js
// Endpoint: POST /api/create-order
// Creates a Razorpay order for the premium plan and returns the order details to the frontend.
// Uses Razorpay Node SDK and environment variables for test keys.

const Razorpay = require('razorpay');

// TODO: Store these securely in environment variables
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_YourTestKeyHere';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'YourTestSecretHere';

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

/**
 * POST /api/create-order
 * Body: { plan: 'premium' }
 */
export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }
  try {
    // Parse the request body from event.body
    const { plan } = JSON.parse(event.body || '{}');
    // For demo, fixed price for premium plan
    const amount = 1900 * 100; // INR 1900 in paise (example: 1900 INR)
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
      body: JSON.stringify({ order }),
    };
  } catch (err) {
    console.error('Error creating Razorpay order:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to create order' }),
    };
  }
};
