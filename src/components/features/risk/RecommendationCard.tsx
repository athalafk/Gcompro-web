// src/components/features/risk/RecommendationCard.tsx
'use client';

type Props = {
  title: string;
  priority: 'Tinggi' | 'Sedang' | 'Rendah';
  description: string;
  prerequisites: string[];
};

const DotIcon = () => (
  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="8" />
  </svg>
);

export default function RecommendationCard({
  title,
  priority,
  description,
  prerequisites,
}: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
      <div className="flex gap-3">
        {/* Kolom Ikon */}
        <div className="flex-shrink-0 pt-1">
          <DotIcon />
        </div>
        
        {/* Kolom Konten */}
        <div className="flex-grow">
          {/* Baris Judul */}
          <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
          
          {/* Baris Prioritas */}
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-semibold">Prioritas : {priority}</span>
            <span className="text-gray-500"> ({description})</span>
          </p>
          
          {/* Baris Prasyarat */}
          <div className="flex items-center flex-wrap gap-2 mt-3">
            <span className="text-sm font-medium text-gray-600">
              Mata Kuliah Prasyarat :
            </span>
            {prerequisites.map((prereq) => (
              <span
                key={prereq}
                className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full border border-gray-300"
              >
                {prereq}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}