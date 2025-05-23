// /src/app/api/verify-payment.js
// Endpoint: POST /api/verify-payment
// Verifies Razorpay payment signature, stores transaction in Supabase, and activates subscription.

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Environment variables configuration
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!RAZORPAY_KEY_SECRET) {
  console.error('RAZORPAY_KEY_SECRET is not configured');
  throw new Error('RAZORPAY_KEY_SECRET is required');
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase configuration is incomplete');
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * POST /api/verify-payment
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan }
 */
exports.handler = async function(event, context) {
  // Parse the request body
  const req = {
    method: event.httpMethod,
    body: JSON.parse(event.body || '{}')
  };
  
  const res = {
    status: (code) => ({
      json: (data) => ({
        statusCode: code,
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      })
    })
  };

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, user_id } = req.body;
    
    // Enhanced validation logging
    console.log('Received payment parameters:', {
      razorpay_order_id: razorpay_order_id || 'missing',
      razorpay_payment_id: razorpay_payment_id || 'missing',
      razorpay_signature: razorpay_signature ? 'present' : 'missing',
      plan: plan || 'missing',
      user_id: user_id || 'missing'
    });
    
    // Validate required parameters with specific error messages
    const missingParams = [];
    if (!razorpay_order_id) missingParams.push('razorpay_order_id');
    if (!razorpay_payment_id) missingParams.push('razorpay_payment_id');
    if (!razorpay_signature) missingParams.push('razorpay_signature');
    
    if (missingParams.length > 0) {
      console.error('Missing required payment parameters:', {
        missing: missingParams,
        received: {
          razorpay_order_id: !!razorpay_order_id,
          razorpay_payment_id: !!razorpay_payment_id,
          razorpay_signature: !!razorpay_signature
        }
      });
      return res.status(400).json({ 
        success: false, 
        message: `Missing required payment parameters: ${missingParams.join(', ')}`,
        details: {
          missing: missingParams,
          received: {
            razorpay_order_id: !!razorpay_order_id,
            razorpay_payment_id: !!razorpay_payment_id,
            razorpay_signature: !!razorpay_signature
          }
        }
      });
    }

    // Parse credits from plan (e.g., 'credits_100')
    const creditsPurchased = plan && plan.startsWith('credits_') ? parseInt(plan.split('_')[1]) : 0;

    // 1. Signature verification
    const generated_signature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    
    console.log('Signature verification:', {
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      generated_signature,
      received_signature: razorpay_signature,
      matches: generated_signature === razorpay_signature
    });
    
    if (generated_signature !== razorpay_signature) {
      console.error('Payment signature verification failed:', {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        expected: generated_signature,
        received: razorpay_signature
      });
      // Update transaction as failed
      try {
        await supabase.from('transactions').update({
          payment_id: razorpay_payment_id || null,
          status: 'failed',
          plan: plan || null
        }).eq('order_id', razorpay_order_id);
      } catch (txErr) {
        console.error('Supabase update error (failed payment):', txErr);
      }
      return res.status(400).json({ 
        success: false, 
        message: 'Payment signature verification failed. This could be due to tampering or incorrect parameters. Please ensure all payment details are correct and try again. If the issue persists, please contact support with your order ID: ' + razorpay_order_id
      });
    }
    // 2. Update transaction in Supabase as success
    console.log('Attempting to update transaction in Supabase...');
    try {
      await supabase.from('transactions').update({
        payment_id: razorpay_payment_id,
        status: 'success',
        plan
      }).eq('order_id', razorpay_order_id);
    } catch (txErr) {
      console.error('Supabase update error (success payment):', txErr);
    }
    // 3. Increment user's credits if user_id and creditsPurchased are valid
    if (user_id && creditsPurchased > 0) {
      try {
        await supabase.rpc('increment_credits', { user_id_param: user_id, credits_to_add: creditsPurchased });
      } catch (creditErr) {
        // Fallback to direct update if RPC not available
        try {
          await supabase.from('profiles').update({
            credits: supabase.raw('credits + ?', [creditsPurchased])
          }).eq('id', user_id);
        } catch (fallbackErr) {
          console.error('Supabase update error (increment credits):', fallbackErr);
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    // Update transaction as failed
    try {
      const { razorpay_order_id, razorpay_payment_id, plan, user_id } = req.body || {};
      await supabase.from('transactions').update({
        payment_id: razorpay_payment_id || null,
        status: 'failed',
        plan: plan || null
      }).eq('order_id', razorpay_order_id || null);
    } catch (txErr) {
      console.error('Supabase update error (catch block):', txErr);
    }
    console.error('Payment verification error:', {
      error: err.message,
      stack: err.stack,
      order_id: req.body?.razorpay_order_id,
      payment_id: req.body?.razorpay_payment_id,
      user_id: req.body?.user_id,
      plan: req.body?.plan
    });
    const errorMessage = err.message || 'Unknown error occurred';
    console.error('Detailed payment verification error:', {
      error: errorMessage,
      order_id: req.body?.razorpay_order_id,
      payment_id: req.body?.razorpay_payment_id
    });
    return res.status(500).json({ 
      success: false, 
      message: 'Payment verification failed. Please try again or contact support with your order ID: ' + (req.body?.razorpay_order_id || 'N/A')
    });
  }
};
