import { Handler } from '@netlify/functions';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = JSON.parse(event.body || '{}');

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Missing required payment verification parameters',
        }),
      };
    }

    // Verify payment signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: 'Payment verification failed',
        }),
      };
    }

    // Verify payment status
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    
    if (payment.status !== 'captured') {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: 'Payment not captured',
        }),
      };
    }

    // TODO: Update user's subscription status in your database
    // This is where you would implement the logic to update the user's premium status

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Payment verified successfully',
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
      }),
    };
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: error.message || 'Error verifying payment',
      }),
    };
  }
};