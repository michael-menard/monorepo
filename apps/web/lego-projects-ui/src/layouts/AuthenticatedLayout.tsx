import type { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header / Navigation */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Navbar />
        </div>
      </header>
      {/* Main content */}
      <main className="flex-1 px-4 py-8">
        {children}
      </main>
      {/* Footer */}
      <Footer />
    </div>
  );
} 