
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/landing/Footer";
import { Card } from "@/components/ui/card";
import { DollarSign, Package } from "lucide-react";
import React, { useState } from "react";

// Razorpay script loader
function loadRazorpayScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const PricingPage = () => {
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string>("");

  // TODO: Update with your backend endpoint
  const CREATE_ORDER_API = "/.netlify/functions/create-order";
  const VERIFY_PAYMENT_API = "/.netlify/functions/verify-payment";

  // Razorpay test key (do NOT use secret key here)
  const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID; // TODO: Replace with your Razorpay test key

  // Purchase handler
  const handlePurchase = async () => {
    setLoading(true);
    setStatus(null);
    setMessage("");
    // 1. Load Razorpay script
    const res = await loadRazorpayScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!res) {
      setLoading(false);
      setStatus("error");
      setMessage("Failed to load payment gateway. Please try again.");
      return;
    }
    try {
      // 2. Create order on backend
      const orderRes = await fetch(CREATE_ORDER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "premium" })
      });
      const orderData = await orderRes.json();
      if (!orderData || !orderData.order) throw new Error(orderData.message || "Order creation failed");

      // 3. Open Razorpay checkout
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        order_id: orderData.order.id,
        name: "BioStruct Premium",
        description: "Premium Subscription",
        image: "/logo.png", // optional
        handler: async function (response: any) {
          // 4. Verify payment on backend
          setLoading(true);
          setStatus(null);
          setMessage("");
          const verifyRes = await fetch(VERIFY_PAYMENT_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: "premium"
            })
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            setStatus("success");
            setMessage("Payment successful! Premium features activated.");
          } else {
            setStatus("error");
            setMessage(verifyData.message || "Payment verification failed.");
          }
          setLoading(false);
        },
        prefill: {
          // Optionally prefill user info
        },
        theme: {
          color: "#4f46e5"
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setStatus(null);
            setMessage("");
          }
        }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Payment initiation failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-16">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-4 mb-12">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Simple, Transparent Pricing
            </h1>
            <p className="max-w-[600px] text-muted-foreground text-lg">
              Choose the plan that best fits your needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="p-6 space-y-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-biostruct-500" />
                <h2 className="text-2xl font-bold">Free Plan</h2>
              </div>
              <div className="text-3xl font-bold">$0</div>
              <ul className="space-y-2 text-muted-foreground">
                <li>10 Free Credits everyday</li>
                <li>Access to All Tools</li>
                <li>Basic Support</li>
              </ul>
            </Card>

            <Card className="p-6 space-y-4 bg-muted/30">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-biostruct-500" />
                <h2 className="text-2xl font-bold">Premium Plan</h2>
              </div>
              <div className="text-3xl font-bold">$19 <span className="text-base font-normal">/ month</span></div>
              <ul className="space-y-2 text-muted-foreground">
                <li>Advanced Features</li>
                <li>Pay As You Go</li>
                <li>Priority Support</li>
              </ul>
              <button
                onClick={handlePurchase}
                className="w-full mt-4 bg-biostruct-500 hover:bg-biostruct-600 text-white font-semibold py-2 px-4 rounded shadow focus:outline-none focus:ring-2 focus:ring-biostruct-400 focus:ring-opacity-50 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Purchase Premium'}
              </button>
              {status && (
                <div className={`mt-2 text-sm ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message}</div>
              )}
              <div className="mt-4 text-xs text-muted-foreground text-left">
                <strong>Payment Terms:</strong> Subscription is billed monthly. Cancel anytime.<br/>
                <strong>Refund Policy:</strong> Full refund within 7 days if not satisfied.<br/>
                <strong>Secure Payment:</strong> Payments handled by Razorpay. We do not store card details.
              </div>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PricingPage;
