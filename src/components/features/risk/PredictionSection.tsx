// src/components/features/risk/PredictionSection.tsx
'use client';

import CircleIcon from '@mui/icons-material/Circle';
import type { AiPredictGraduationResponse } from '@/models/types/students/risk';


const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
  green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-500' },
  red: { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-500' },
  default: { bg: 'bg-gray-50', text: 'text-gray-700', icon: 'text-gray-500' },
};

const DetailCard = ({ label, value }: { label: string; value: number }) => (
  <div 
    className="
      rounded-xl p-5 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden
      bg-gradient-to-r from-[#0B3156] to-[#557896] text-white
    "
  >
    <span className="text-xl font-extrabold tracking-wide z-10 leading-6 drop-shadow-sm">
      {label}
    </span>
    <span className="text-4xl font-extrabold self-end tracking-tight z-10">
      {value}
    </span>
    <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full -mr-10 -mt-10 pointer-events-none" />
  </div>
);

export default function PredictionSection({ data }: { data: AiPredictGraduationResponse | null }) {
  // Guard clause jika data null/undefined
  if (!data) return null;

  const styles = colorMap[data.color] || colorMap.default;

  return (
    <div className="space-y-6">
      {/* Alert Status */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Prediksi Lulus Tepat Waktu
        </h3>
        <div className={`rounded-xl p-6 ${styles.bg} border border-transparent`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-800">Perkiraan :</span>
            <CircleIcon className={`w-4 h-4 ${styles.icon}`} sx={{ fontSize: 16 }} />
            <span className={`text-lg font-bold ${styles.text}`}>
              {/* Hapus emoji dari teks jika API mengirimnya, agar tidak double */}
              {data.status.replace(/🟢|🟠|🔴/g, '').trim()}
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {data.description}
          </p>
        </div>
      </div>

      {/* Detail Progres */}
      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-4">
          Detail Progres Akademik
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DetailCard label="SKS yang diperlukan" value={data.stats.sks_needed} />
          <DetailCard label="Semester Yang Tersisa" value={data.stats.semesters_left} />
          <DetailCard label="Laju Yang Dibutuhkan" value={data.stats.required_pace} />
          <DetailCard label="Kapasitas Mahasiswa" value={data.stats.student_capacity} />
        </div>
      </div>
    </div>
  );
}