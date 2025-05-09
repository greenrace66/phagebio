import Razorpay from 'razorpay';
import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import dotenv from 'dotenv';

// Configure dotenv to load variables from .env.local for local development
// For production, Netlify will use environment variables set in its UI.
dotenv.config({ path: '../../../../.env.local' }); // Adjust path relative to this file's location if moved

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!, // Use backend-specific key ID
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

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
        body: JSON.stringify({ message: 'Request body is missing.' }),
      };
    }
    const { amount, currency } = JSON.parse(event.body);

    if (!amount || !currency) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Amount and currency are required.' }),
      };
    }

    const options = {
      amount: amount * 100, // amount in the smallest currency unit (e.g., paise for INR)
      currency,
      receipt: `receipt_order_${new Date().getTime()}`,
    };

    const order = await razorpay.orders.create(options);

    if (!order) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Failed to create order with Razorpay.' }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    };
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message || 'Internal Server Error' }),
    };
  }
};

export { handler };