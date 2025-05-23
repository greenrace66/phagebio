// netlify/functions/create-order.js
// Netlify Function: POST /.netlify/functions/create-order
// Creates a Razorpay order for credit purchase and returns the order details to the frontend.

const Razorpay = require('razorpay');
const { createClient } = require('@supabase/supabase-js');

// Environment variables configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET; 
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

/**
 * POST /api/create-order
 * Body: { credits: number, amount: number, currency: string }
 */
exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { credits, amount, currency } = body;
    
    // Enhanced validation logging
    console.log('Received order parameters:', {
      credits: credits || 'missing',
      amount: amount || 'missing',
      currency: currency || 'missing'
    });

    // Validate required parameters
    if (!credits || !amount || !currency) {
      console.error('Missing required parameters:', { credits, amount, currency });
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          message: 'Missing required parameters: credits, amount, and currency are required' 
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Validate credits
    if (credits < 100) {
      console.error('Invalid credits amount:', credits);
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          message: 'Minimum credit purchase is 100 credits' 
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Enforce minimum amount: 100 credits = 1 USD = 83 INR
    const MIN_CREDITS = 100;
    const MIN_AMOUNT_INR = 83; // 1 USD = 83 INR
    const MIN_AMOUNT_PAISE = MIN_AMOUNT_INR * 100; // Razorpay expects paise
    if (credits < MIN_CREDITS || amount < MIN_AMOUNT_PAISE) {
      console.error('Amount or credits below minimum:', { credits, amount });
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: `Minimum purchase is 100 credits (₹${MIN_AMOUNT_INR} or $1.00)`
        }),
        headers: { 'Content-Type': 'application/json' }
      };
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

    // Log transaction in Supabase (status: created)
    if (supabase) {
      try {
        await supabase.from('transactions').insert([
          {
            user_id: body.user_id || null,
            order_id: order.id,
            payment_id: null,
            plan: `credits_${credits}`,
            status: 'created',
            created_at: new Date().toISOString()
          }
        ]);
      } catch (txErr) {
        console.error('Supabase insert error (order creation):', txErr);
      }
    }

    console.log('Order created successfully:', {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      credits: credits
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt
        }
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (error) {
    console.error('Order creation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        message: error.message || 'Failed to create order',
        details: error.error ? error.error.description : undefined
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
