import type { ReactNode } from 'react';
import { Navbar } from '@/components/Navbar';

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
      <main className="flex-1">
        {children}
      </main>
      {/* Footer */}
      <footer className="bg-white border-t py-4 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Lego Projects. All rights reserved.
      </footer>
    </div>
  );
} 