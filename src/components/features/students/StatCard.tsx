// src/components/features/students/StatCard.tsx

const TrendUpIcon = () => (
  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24">
    <path 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M3.5 18.5 12 10l-4 4 8.5-8.5" 
    />
    <path 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M18 1.5h-5.5v5.5" 
    />
  </svg>
);

export default function StatCard({ title, value }: { title: string, value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 h-full shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm text-gray-500">{title}</h3>
          <p className="text-4xl font-bold text-gray-800">{value}</p>
        </div>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
          <TrendUpIcon />
        </div>
      </div>
    </div>
  );
}