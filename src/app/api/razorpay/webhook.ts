import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Configure dotenv
dotenv.config({ path: '../../../../.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Razorpay webhook secret for signature verification
const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST' },
      body: 'Method Not Allowed',
    };
  }

  const signature = event.headers['x-razorpay-signature'];
  const rawBody = event.body;

  if (!signature) {
    console.error('Webhook Error: Missing X-Razorpay-Signature header');
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Signature missing' }),
    };
  }

  if (!rawBody) {
    console.error('Webhook Error: Missing request body');
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Request body missing' }),
    };
  }

  try {
    const shasum = crypto.createHmac('sha256', razorpayWebhookSecret);
    shasum.update(rawBody); // Netlify Functions provide the raw body directly
    const digest = shasum.digest('hex');

    if (digest === signature) {
      // Signature is valid
      const parsedEvent = JSON.parse(rawBody.toString());
      console.log('Received Razorpay Webhook Event:', parsedEvent.event, parsedEvent.payload);

      // Handle different webhook events
      switch (parsedEvent.event) {
        case 'payment.captured':
          const paymentEntity = parsedEvent.payload.payment.entity;
          console.log(`Payment captured for Order ID: ${paymentEntity.order_id}, Payment ID: ${paymentEntity.id}`);
          // TODO: Update your database, mark order as paid, activate subscription
          // Example: await activateSubscription(paymentEntity.order_id);
          break;
        case 'payment.failed':
          const failedPaymentEntity = parsedEvent.payload.payment.entity;
          console.log(`Payment failed for Order ID: ${failedPaymentEntity.order_id}, Payment ID: ${failedPaymentEntity.id}`);
          // TODO: Update your database, handle failed payment (e.g., notify user)
          break;
        case 'order.paid':
          const orderEntity = parsedEvent.payload.order.entity;
          console.log(`Order paid: ${orderEntity.id}, Amount: ${orderEntity.amount_paid}`);
          // This event might be redundant if you handle 'payment.captured'
          // but can be useful for reconciliation.
          break;
        // Add more cases for other events you want to handle, e.g.:
        // case 'subscription.activated':
        // case 'subscription.charged':
        // case 'refund.processed':
        default:
          console.log('Unhandled Razorpay webhook event:', parsedEvent.event);
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ok', message: 'Webhook received successfully' }),
      };
    } else {
      console.error('Webhook Error: Invalid signature');
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Invalid signature' }),
      };
    }
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message || 'Webhook processing failed' }),
    };
  }
};

export { handler };