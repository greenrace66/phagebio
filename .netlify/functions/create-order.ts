import { Handler } from '@netlify/functions';
import Razorpay from 'razorpay';

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
    const { amount, currency = 'INR' } = JSON.parse(event.body || '{}');

    if (!amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Amount is required' }),
      };
    }

    const options = {
      amount: amount * 100, // Convert to smallest currency unit (paise)
      currency,
      receipt: `order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    return {
      statusCode: 200,
      body: JSON.stringify(order),
    };
  } catch (error: any) {
    console.error('Error creating order:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message || 'Error creating order',
      }),
    };
  }
};