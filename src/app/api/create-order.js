// /src/app/api/create-order.js
// Endpoint: POST /api/create-order
// Creates a Razorpay order for credit purchase and returns the order details to the frontend.
// Uses Razorpay Node SDK and environment variables for test keys.

const Razorpay = require('razorpay');

// TODO: Store these securely in environment variables
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Validate required environment variables
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error('Razorpay environment variables are not configured');
  throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required');
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

/**
 * POST /api/create-order
 * Body: { credits: number }
 */
export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ 
        success: false,
        message: 'Method not allowed' 
      }),
    };
  }

  try {
    // Parse the request body from event.body
    const { credits } = JSON.parse(event.body || '{}');

    // Validate credits
    if (!credits || credits < 100) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false,
          message: 'Minimum credit purchase is 100 credits' 
        })
      };
    }

    // Calculate amount (100 credits = $1)
    const amount = Math.round(credits); // Amount in cents
    const currency = 'INR';
    const receipt = `receipt_credits_${credits}_${Date.now()}`;

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
      payment_capture: 1,
      notes: {
        credits: credits.toString(),
        description: `Purchase of ${credits} credits`
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        order,
        credits,
        amount: amount / 100 // Convert cents to dollars for display
      }),
    };
  } catch (err) {
    console.error('Error creating Razorpay order:', err);
    
    // Handle specific error cases
    let errorMessage = 'Failed to create order';
    let statusCode = 500;

    if (err.error) {
      // Handle Razorpay specific errors
      if (err.error.description) {
        errorMessage = err.error.description;
      }
      if (err.error.http_status_code) {
        statusCode = err.error.http_status_code;
      }
    }

    return {
      statusCode,
      body: JSON.stringify({ 
        success: false,
        message: errorMessage,
        error: err.message
      }),
    };
  }
}
