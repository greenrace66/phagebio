import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import Razorpay from 'razorpay';

// Initialize Razorpay with your key_id and key_secret
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { amount, currency = 'INR', receipt, notes } = JSON.parse(event.body || '{}');

    if (!amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Amount is required' })
      };
    }

    // Create order using Razorpay
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to smallest currency unit (paise)
      currency,
      receipt,
      notes
    });

    return {
      statusCode: 200,
      body: JSON.stringify(order)
    };
  } catch (error: any) {
    console.error('Error creating order:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Error creating order',
        details: error.message
      })
    };
  }
};

export { handler };