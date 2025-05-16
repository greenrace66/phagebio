import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/landing/Footer";
import { Card } from "@/components/ui/card";
import { CreditCard, Package } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useRazorpay } from "@/contexts/RazorpayContext";
import { toast } from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PricingPage = () => {
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string>("");
  const [credits, setCredits] = useState<number>(100); // Default to 100 credits
  
  // Use the Razorpay context
  const { isLoading: razorpayLoading, isProcessing, initiatePayment } = useRazorpay();
  
  // Update loading state when Razorpay context changes
  useEffect(() => {
    setLoading(razorpayLoading || isProcessing);
  }, [razorpayLoading, isProcessing]);

  // Calculate price based on credits (100 credits = $1)
  const calculatePrice = (credits: number) => {
    return (credits / 100).toFixed(2);
  };

  // Convert USD to INR (using approximate rate of 1 USD = 83 INR)
  const convertToINR = (usdAmount: number) => {
    return Math.round(usdAmount * 83);
  };

  // Handle credit input change with validation
  const handleCreditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      // Ensure minimum value is 100
      const validValue = Math.max(100, value);
      setCredits(validValue);
    }
  };

  // Purchase handler
  const handlePurchase = async () => {
    setStatus(null);
    setMessage("");
    
    try {
      // Validate credits before proceeding
      if (!credits || credits < 100) {
        setStatus("error");
        setMessage("Minimum credit purchase is 100 credits");
        toast.error("Please select at least 100 credits");
        return;
      }

      // Calculate amount in INR (100 credits = $1 = ₹83)
      const amount = Math.round(credits * 0.83); // Convert credits to INR
      
      // Use the initiatePayment method from RazorpayContext
      const result = await initiatePayment(amount, credits.toString());
      
      if (result) {
        setStatus("success");
        setMessage(`Payment successful! ${credits} credits added to your account.`);
        toast.success(`Successfully purchased ${credits} credits!`);
      }
    } catch (err: any) {
      setStatus("error");
      const errorMessage = err.message || "Payment initiation failed.";
      setMessage(errorMessage);
      
      // Handle specific error cases
      if (errorMessage.toLowerCase().includes('cancelled') || errorMessage.toLowerCase().includes('canceled')) {
        toast.error("Payment was cancelled. Please try again if you wish to purchase credits.");
      } else {
        toast.error("Payment failed. Please try again later.");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-16">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-4 mb-12">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Purchase Credits
            </h1>
            <p className="max-w-[600px] text-muted-foreground text-lg">
              Buy credits to use our premium features
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="p-6 space-y-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-biostruct-500" />
                <h2 className="text-2xl font-bold">Credit System</h2>
              </div>
              <div className="text-3xl font-bold">$1 = 100 Credits</div>
              <ul className="space-y-2 text-muted-foreground">
                <li>Flexible credit purchase</li>
                <li>Use credits for premium features</li>
                <li>Credits never expire</li>
                <li>Buy more, save more</li>
              </ul>
            </Card>

            <Card className="p-6 space-y-4 bg-muted/30">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-biostruct-500" />
                <h2 className="text-2xl font-bold">Purchase Credits</h2>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="credits">Number of Credits</Label>
                  <div className="relative">
                    <Input
                      id="credits"
                      type="number"
                      min="100"
                      step="100"
                      value={credits}
                      onChange={handleCreditChange}
                      className="w-full pr-12"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      credits
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Minimum purchase: 100 credits
                  </p>
                </div>
                
                <div className="text-2xl font-bold text-center">
                  Total: ${calculatePrice(credits)} (₹{convertToINR(credits / 100)})
                </div>
                
                <button
                  onClick={handlePurchase}
                  className="w-full mt-4 bg-biostruct-500 hover:bg-biostruct-600 text-white font-semibold py-2 px-4 rounded shadow focus:outline-none focus:ring-2 focus:ring-biostruct-400 focus:ring-opacity-50 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : `Purchase ${credits} Credits`}
                </button>
                
                {status && (
                  <div className={`mt-2 text-sm font-medium ${
                    status === 'success' 
                      ? 'text-green-600 bg-green-50 p-2 rounded' 
                      : 'text-red-600 bg-red-50 p-2 rounded'
                  }`}>
                    {message}
                  </div>
                )}
              </div>

              <div className="mt-4 text-xs text-muted-foreground text-left">
                <strong>Payment Terms:</strong> Credits are added immediately after successful payment.<br/>
                <strong>Refund Policy:</strong> Credits are non-refundable once purchased.<br/>
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
