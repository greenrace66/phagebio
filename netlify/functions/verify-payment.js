
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
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, credits, user_id }
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, credits, user_id } = req.body;
    
    // Enhanced validation logging
    console.log('Received payment parameters:', {
      razorpay_order_id: razorpay_order_id || 'missing',
      razorpay_payment_id: razorpay_payment_id || 'missing',
      razorpay_signature: razorpay_signature ? 'present' : 'missing',
      credits: credits || 'missing',
      user_id: user_id || 'missing'
    });
    
    // Validate required parameters
    const missingParams = [];
    if (!razorpay_order_id) missingParams.push('razorpay_order_id');
    if (!razorpay_payment_id) missingParams.push('razorpay_payment_id');
    if (!razorpay_signature) missingParams.push('razorpay_signature');
    if (!credits) missingParams.push('credits');
    
    if (missingParams.length > 0) {
      console.error('Missing required payment parameters:', {
        missing: missingParams,
        received: {
          razorpay_order_id: !!razorpay_order_id,
          razorpay_payment_id: !!razorpay_payment_id,
          razorpay_signature: !!razorpay_signature,
          credits: !!credits
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
            razorpay_signature: !!razorpay_signature,
            credits: !!credits
          }
        }
      });
    }

    // 1. Signature verification
    const generated_signature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    
    if (generated_signature !== razorpay_signature) {
      console.error('Payment signature verification failed:', {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        expected: generated_signature,
        received: razorpay_signature
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Payment signature verification failed. This could be due to tampering or incorrect parameters. Please ensure all payment details are correct and try again. If the issue persists, please contact support with your order ID: ' + razorpay_order_id
      });
    }

    // 2. Store transaction in Supabase
    const { data, error } = await supabase.from('transactions').insert([
      {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        plan: `credits_${credits}`,
        user_id: user_id || null,
        status: 'success',
        created_at: new Date().toISOString(),
      },
    ]);
    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    // 3. Update user's credits if user_id is provided
    if (user_id) {
      // First get current credits
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user_id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return res.status(500).json({ success: false, message: 'Error fetching user profile' });
      }

      const currentCredits = profileData?.credits || 0;
      const newCredits = currentCredits + parseInt(credits);

      console.log('Updating user credits:', {
        user_id,
        currentCredits,
        creditsToAdd: parseInt(credits),
        newCredits
      });

      // Update user's credits
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', user_id);
      
      if (updateError) {
        console.error('Credits update error:', updateError);
        return res.status(500).json({ success: false, message: 'Failed to update credits' });
      }
    }

    return res.status(200).json({ 
      success: true,
      credits: parseInt(credits),
      message: `Successfully added ${credits} credits to your account`
    });
  } catch (err) {
    console.error('Payment verification error:', err);
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
