// src/components/features/risk/RiskProgressBar.tsx
'use client';

type RiskLevel = 'Aman' | 'Resiko Rendah' | 'Resiko Sedang' | 'Resiko Tinggi';

type Props = {
  level: RiskLevel;
  value: number;
};

export default function RiskProgressBar({ level, value }: Props) {
  const normalizedLevel = level.trim(); 

  const barColor =
    normalizedLevel === 'Aman'
      ? 'bg-green-500' // Hijau
      : normalizedLevel === 'Resiko Rendah'
      ? 'bg-yellow-500' // Kuning
      : normalizedLevel === 'Resiko Sedang'
      ? 'bg-orange-500' // Oranye
      : 'bg-red-500'; // Merah

  const textColor =
    normalizedLevel === 'Aman'
      ? 'text-green-600'
      : normalizedLevel === 'Resiko Rendah'
      ? 'text-yellow-600'
      : normalizedLevel === 'Resiko Sedang'
      ? 'text-orange-600'
      : 'text-red-600';

  return (
    <div className="p-4 w-full">
      <div className="text-center mb-4">
        <p className="text-sm text-gray-600 mb-1">Tingkat Risiko Anda Saat Ini:</p>
        <p className={`text-2xl font-bold ${textColor}`}>
          {normalizedLevel}
        </p>
      </div>

      <div 
        className="w-full bg-gray-200 rounded-full h-4" 
        title={`Tingkat Risiko: ${normalizedLevel} (${value}%)`}
      >
        <div
          className={`h-4 rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>

      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>Risiko Rendah</span>
        <span>Risiko Tinggi</span>
      </div>
    </div>
  );
}