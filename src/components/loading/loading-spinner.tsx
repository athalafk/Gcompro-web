import React from "react";

export default function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-6">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200 opacity-30"></div>

        <div
          className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin
          border-blue-500 border-r-blue-400 border-b-indigo-400 border-l-transparent"
          style={{
            animationDuration: "1s",
          }}
        ></div>

        {/* <div className="absolute inset-[30%] bg-blue-500 rounded-full blur-[2px] opacity-80"></div> */}
      </div>

      {message && (
        <p className="text-gray-600 text-lg font-medium animate-pulse text-center">
          {message}
        </p>
      )}
    </div>
  );
}
