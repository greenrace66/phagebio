import axios from 'axios';

// TypeScript interfaces for Razorpay
export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status?: string;
  created_at?: number;
}

export interface RazorpayPayment {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  credits?: string;
}

/**
 * Loads the Razorpay script dynamically
 * @returns Promise<boolean> - true if script loaded successfully
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if script is already loaded
    if (document.getElementById('razorpay-script')) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
};

/**
 * Creates a new order with Razorpay
 * @param amount - Amount in smallest currency unit (cents for USD)
 * @param currency - Currency code (e.g., 'USD')
 * @param receipt - Receipt ID in format 'credits_100'
 * @returns Promise<RazorpayOrder | null> - Order details or null if failed
 */
export const createOrder = async (
  amount: number,
  currency: string,
  receipt: string
): Promise<RazorpayOrder | null> => {
  try {
    // Extract credits from receipt (format: credits_100)
    const credits = receipt.split('_')[1];
    if (!credits) {
      throw new Error('Invalid receipt format. Expected format: credits_100');
    }

    // Call the backend API to create an order
    const response = await axios.post('/api/create-order', {
      credits: parseInt(credits),
      amount,
      currency,
    });

    if (response.data && response.data.order) {
      return response.data.order as RazorpayOrder;
    }
    throw new Error('Failed to create order: Invalid response from server');
  } catch (error: any) {
    console.error('Error creating order:', error);
    throw error;
  }
};

/**
 * Verifies a payment with the backend
 * @param payment - Payment details from Razorpay
 * @returns Promise<boolean> - true if payment is verified
 */
export const verifyPayment = async (payment: RazorpayPayment): Promise<boolean> => {
  try {
    if (!payment.credits) {
      throw new Error('Credits information is missing from payment');
    }

    // Call the backend API to verify the payment
    const response = await axios.post('/api/verify-payment', {
      razorpay_payment_id: payment.razorpay_payment_id,
      razorpay_order_id: payment.razorpay_order_id,
      razorpay_signature: payment.razorpay_signature,
      credits: payment.credits,
      user_id: (window as any).user?.id // Get user ID from global state
    });

    return response.data && response.data.success === true;
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};