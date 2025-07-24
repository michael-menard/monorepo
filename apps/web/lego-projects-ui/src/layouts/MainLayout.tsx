import { Outlet } from "react-router-dom";
import Navbar from '../components/Navbar/index.js';
import Footer from '../components/Footer/index.js';

export default function MainLayout() {
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