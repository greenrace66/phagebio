// netlify/functions/create-order.js
// Netlify Function: POST /.netlify/functions/create-order
// Creates a Razorpay order for credit purchase and returns the order details to the frontend.

const Razorpay = require('razorpay');

// Environment variables configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET; 

// Validate required environment variables
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error('Razorpay configuration is incomplete');
  throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required');
}

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

/**
 * POST /api/create-order
 * Body: { credits: number, amount: number, currency: string }
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { credits, amount, currency } = req.body;
    
    // Enhanced validation logging
    console.log('Received order parameters:', {
      credits: credits || 'missing',
      amount: amount || 'missing',
      currency: currency || 'missing'
    });

    // Validate required parameters
    if (!credits || !amount || !currency) {
      console.error('Missing required parameters:', { credits, amount, currency });
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters: credits, amount, and currency are required' 
      });
    }

    // Validate credits
    if (credits < 100) {
      console.error('Invalid credits amount:', credits);
      return res.status(400).json({ 
        success: false, 
        message: 'Minimum credit purchase is 100 credits' 
      });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount,
      currency: 'INR',
      receipt: `credits_${credits}`,
      notes: {
        credits: credits.toString()
      }
    });

    console.log('Order created successfully:', {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      credits: credits
    });

    return res.status(200).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      }
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create order',
      details: error.error ? error.error.description : undefined
    });
  }
};
