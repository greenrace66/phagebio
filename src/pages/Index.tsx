
import Navbar from "@/components/navigation/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/pages/Features";
import DemoSection from "@/components/landing/DemoSection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <DemoSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
