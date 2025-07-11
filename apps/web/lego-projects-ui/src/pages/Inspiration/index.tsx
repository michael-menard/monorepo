import { Outlet } from 'react-router-dom';

export default function InspirationLayout() {
  return (
    <div className="inspiration-layout min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Inspiration Gallery</h1>
          <p className="mt-2 text-lg text-gray-600">
            Discover amazing Lego creations and get inspired for your next build
          </p>
        </div>
        
        <Outlet />
      </div>
    </div>
  );
} 