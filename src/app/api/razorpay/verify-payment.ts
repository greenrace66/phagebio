import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Configure dotenv to load variables from .env.local for local development
// For production, Netlify will use environment variables set in its UI.
dotenv.config({ path: '../../../../.env.local' }); // Adjust path relative to this file's location

const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET!;

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST' },
      body: 'Method Not Allowed',
    };
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Request body is missing.' }),
      };
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = JSON.parse(event.body);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Missing payment details.' }),
      };
    }

    const bodyString = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(bodyString.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Payment is authentic, proceed with order fulfillment
      // TODO: Store transaction details in your database
      // TODO: Activate subscription for the user

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'Payment verified successfully.',
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
        }),
      };
    } else {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, message: 'Invalid signature. Payment verification failed.' }),
      };
    }
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, message: error.message || 'Internal Server Error' }),
    };
  }
};

export { handler };