import React from 'react';
import FloatingShape from '../FloatingShape';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-500 flex justify-center items-center relative overflow-hidden'>
      <FloatingShape
        color='bg-green-500'
        size='w-64 h-64'
        top='-5%'
        left='10%'
        delay={0}
        speed='slow' // Very slow and dreamy
      />
      <FloatingShape
        color='bg-emerald-500'
        size='w-48 h-48'
        top='70%'
        left='80%'
        delay={5}
        speed='medium' // Normal pace
      />
      <FloatingShape
        color='bg-lime-500'
        size='w-32 h-32'
        top='40%'
        left='-10%'
        delay={2}
        speed='fast' // Quicker movement
      />
      {/* Main content area with z-index to ensure it's in front of the background */}
      <div className="z-10 flex justify-center items-center w-full">{children}</div>
    </div>
  );
};

export default Layout;
