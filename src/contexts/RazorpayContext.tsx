
import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadRazorpayScript, createOrder, verifyPayment, RazorpayOrder, RazorpayPayment } from '@/services/payments';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RazorpayContextType {
  isLoading: boolean;
  isProcessing: boolean;
  initiatePayment: (amount: number, credits: string) => Promise<boolean>;
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

  // Get current user from useAuth hook
  const { user: authUser } = useAuth();

  useEffect(() => {
    const getCurrentUser = async () => {
      if (authUser) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        setUser(data || authUser);
      } else {
        setUser(null);
      }
    };

    getCurrentUser();
  }, [authUser]);

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

  const initiatePayment = async (amount: number, credits: string): Promise<boolean> => {
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
      console.log('Initiating payment for user:', user.id);
      
      // Create an order with credits
      const order = await createOrder(amount, 'INR', `credits_${credits}`);

      if (!order) {
        throw new Error('Failed to create order');
      }

      console.log('Order created successfully:', order);

      return new Promise((resolve) => {
        // Open Razorpay checkout
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: order.amount.toString(),
          currency: order.currency,
          name: 'Bio Struct Forge',
          description: `Purchase ${credits} Credits`,
          order_id: order.id,
          prefill: {
            name: user.full_name || '',
            email: user.email || '',
          },
          theme: {
            color: '#10b981', // Phage-500 color
          },
          handler: async function (response: RazorpayPayment) {
            try {
              console.log('Payment successful, verifying...', response);
              
              // Verify payment with user ID
              const isVerified = await verifyPayment({
                ...response,
                credits: credits
              }, user.id);
            
              if (isVerified) {
                toast.success(`Payment successful! ${credits} credits added to your account.`);
                setIsProcessing(false);
                resolve(true);
              } else {
                toast.error('Payment verification failed. Please contact support.');
                setIsProcessing(false);
                resolve(false);
              }
            } catch (error) {
              console.error('Payment verification error:', error);
              toast.error('Payment verification failed. Please contact support.');
              setIsProcessing(false);
              resolve(false);
            }
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
              toast.error('Payment cancelled or failed. Please try again.');
              resolve(false);
            },
          },
        };

        // Check if Razorpay is available in window
        if (typeof window !== 'undefined' && (window as any).Razorpay) {
          const razorpay = new (window as any).Razorpay(options);
          razorpay.open();
        } else {
          throw new Error('Razorpay is not initialized');
        }
      });
    } catch (error: any) {
      console.error('Payment initiation error:', error);
      toast.error(error.message || 'Failed to initiate payment. Please try again later.');
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
