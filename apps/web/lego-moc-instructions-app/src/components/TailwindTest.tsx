import React from 'react';

const TailwindTest: React.FC = () => {
  return (
    <div className="p-8 bg-blue-500 text-white rounded-lg shadow-lg m-4">
      <h2 className="text-2xl font-bold mb-4">Tailwind CSS Test</h2>
      <p className="text-lg">If you can see this styled text, Tailwind CSS is working!</p>
      <div className="mt-4 space-y-2">
        <div className="bg-red-500 p-2 rounded">Red background</div>
        <div className="bg-green-500 p-2 rounded">Green background</div>
        <div className="bg-yellow-500 p-2 rounded text-black">Yellow background</div>
      </div>
    </div>
  );
};

export default TailwindTest; 