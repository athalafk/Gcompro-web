import React from 'react';

export default function LoadingSpinner({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-4">
      <div 
        className="w-12 h-12 border-4 border-t-4 border-blue-500 border-opacity-25 rounded-full animate-spin"
        style={{ borderTopColor: 'rgb(59, 130, 246)' }}
      ></div>
      <p className="text-lg text-gray-500">{message}</p>
    </div>
  );
}