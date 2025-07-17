import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer/index";
import { useCrossTabSync } from "@/hooks/useCrossTabSync";
import { useAuthRefresh } from "@/hooks/useAuthRefresh";

export default function MainLayout() {
  // Enable cross-tab auth state synchronization
  useCrossTabSync();
  
  // Enable automatic token refresh
  useAuthRefresh();

  return (
    <div className="flex flex-col min-h-screen">
      <header>
        <Navbar />
      </header>
      <main className="flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer>
        <Footer />
      </footer>
    </div>
  );
} 