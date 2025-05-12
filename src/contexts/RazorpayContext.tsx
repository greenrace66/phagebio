import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadRazorpayScript, createOrder, verifyPayment, RazorpayOrder, RazorpayPayment } from '@/services/payments';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RazorpayContextType {
  isLoading: boolean;
  isProcessing: boolean;
  initiatePayment: (amount: number, planName: string) => Promise<boolean>;
}

const RazorpayContext = createContext<RazorpayContextType | undefined>(undefined);

export const useRazorpay = () => {
  const context = useContext(RazorpayContext);
  if (!context) {
    throw new Error('useRazorpay must be used within a RazorpayProvider');
  }
  return context;
};

interface RazorpayProviderProps {
  children: React.ReactNode;
}

export const RazorpayProvider: React.FC<RazorpayProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        setUser(data);
      }
    };

    getCurrentUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        setUser(data);
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Load Razorpay script on component mount
  useEffect(() => {
    const loadScript = async () => {
      setIsLoading(true);
      try {
        const scriptLoaded = await loadRazorpayScript();
        setIsScriptLoaded(scriptLoaded);
        if (!scriptLoaded) {
          toast.error('Failed to load payment gateway. Please try again later.');
        }
      } catch (error) {
        console.error('Error loading Razorpay script:', error);
        toast.error('Failed to load payment gateway. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadScript();
  }, []);

  const initiatePayment = async (amount: number, planName: string): Promise<boolean> => {
    if (!user) {
      toast.error('Please log in to make a payment');
      return false;
    }

    if (!isScriptLoaded) {
      toast.error('Payment gateway is not loaded. Please try again later.');
      return false;
    }

    setIsProcessing(true);

    try {
      // Create an order
      const receipt = `receipt_${Date.now()}`;
      const order = await createOrder(amount, 'INR', receipt);

      if (!order) {
        throw new Error('Failed to create order');
      }

      // Open Razorpay checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_yourkeyhere',
        amount: order.amount.toString(),
        currency: order.currency,
        name: 'Bio Struct Forge',
        description: `Payment for ${planName}`,
        order_id: order.id,
        prefill: {
          name: user.full_name || '',
          email: user.email || '',
        },
        theme: {
          color: '#10b981', // biostruct-500 color
        },
        handler: async function (response: RazorpayPayment) {
          // Verify payment
          const isVerified = await verifyPayment(response);
          
          if (isVerified) {
            toast.success('Payment successful! Your account has been upgraded.');
            return true;
          } else {
            toast.error('Payment verification failed. Please contact support.');
            return false;
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            toast.info('Payment cancelled');
          },
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
      
      return true;
    } catch (error) {
      console.error('Payment initiation error:', error);
      toast.error('Failed to initiate payment. Please try again later.');
      setIsProcessing(false);
      return false;
    }
  };

  return (
    <RazorpayContext.Provider
      value={{
        isLoading,
        isProcessing,
        initiatePayment,
      }}
    >
      {children}
    </RazorpayContext.Provider>
  );
};
