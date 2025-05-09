
import Footer from "@/components/landing/Footer";
import Navbar from "@/components/navigation/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Package } from "lucide-react";
import { useAuth } from "@/hooks/useAuth"; 
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react"; 

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PricingPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePremiumPurchase = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase a premium plan.",
        variant: "destructive",
      });
      // Potentially redirect to login page
      // navigate("/login"); 
      return;
    }

    setLoading(true);
    try {
      // 1. Create Order on your backend
      const orderResponse = await fetch('/.netlify/functions/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: 999, currency: 'INR' }), // Example: 9.99 INR
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.message || 'Failed to create order.');
      }

      const orderData = await orderResponse.json();

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Get Key ID from .env
        amount: orderData.amount, 
        currency: orderData.currency,
        name: "BioStruct Premium",
        description: "Premium Plan Subscription",
        image: "/logo.png", // Optional: Your company logo
        order_id: orderData.id,
        handler: async function (response: any) {
          // 2. Verify Payment on your backend
          const verificationResponse = await fetch('/.netlify/functions/verify-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          if (!verificationResponse.ok) {
            const errorData = await verificationResponse.json();
            throw new Error(errorData.message || 'Payment verification failed.');
          }

          const verificationData = await verificationResponse.json();
          if (verificationData.success) {
            toast({
              title: "Payment Successful!",
              description: "Your premium plan is now active.",
            });
            // Handle subscription activation logic here
          } else {
            toast({
              title: "Payment Verification Failed",
              description: verificationData.message || "Please contact support.",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: user.name || "", // Optional: Prefill user's name
          email: user.email || "",
          contact: user.phone || "", // Optional: Prefill user's phone
        },
        notes: {
          address: "BioStruct Corporate Office"
        },
        theme: {
          color: "#3c82f6" // Your brand color
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        toast({
          title: "Payment Failed",
          description: `Error: ${response.error.code} - ${response.error.description}`,
          variant: "destructive",
        });
      });
      rzp.open();

    } catch (error: any) {
      console.error("Payment Error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
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
              <div className="text-3xl font-bold">₹999 <span class="text-sm font-normal text-muted-foreground">/ month</span></div>
              <ul className="space-y-2 text-muted-foreground">
                <li>Advanced Features</li>
                <li>Pay As You Go</li>
                <li>Priority Support</li>
              </ul>
              <Button onClick={handlePremiumPurchase} disabled={loading} className="w-full bg-biostruct-500 hover:bg-biostruct-600 text-white">
                {loading ? 'Processing...' : 'Purchase Premium'}
              </Button>
              <p className="text-xs text-muted-foreground text-center pt-2">
                By purchasing, you agree to our <a href="/terms" class="underline">Terms of Service</a> and <a href="/privacy" class="underline">Refund Policy</a>.
              </p>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PricingPage;
