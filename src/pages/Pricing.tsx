
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/landing/Footer";
import { Card } from "@/components/ui/card";
import { DollarSign, Package } from "lucide-react";

const PricingPage = () => {
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
              <div className="text-3xl font-bold">Coming Soon</div>
              <ul className="space-y-2 text-muted-foreground">
                <li>Advanced Features</li>
                <li>Pay As You Go</li>
                <li>Priority Support</li>
              </ul>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PricingPage;
