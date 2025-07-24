import type { ReactNode } from 'react';
import Navbar from '../components/Navbar/index.js';
import Footer from '../components/Footer/index.js';

export default function UnauthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Navbar />
        </div>
      </header>
      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </main>
      {/* Footer */}
      <Footer />
    </div>
  );
} 