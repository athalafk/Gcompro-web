// src/components/features/students/StudentInfoCard.tsx
import Image from "next/image";

type Props = {
  nama: string;
  nim: string;
  prodi: string;
  angkatan: string;
};

const AvatarIcon = () => (
  <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

export default function StudentInfoCard({ nama, nim, prodi, angkatan }: Props) {
  return (
    <div className="flex items-center bg-white border border-gray-200 rounded-2xl p-6 h-full shadow-sm">
      <div className="flex-shrink-0 w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mr-6">
        <AvatarIcon />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 flex-grow">
        <div>
          <h3 className="text-sm text-gray-500">Nama</h3>
          <p className="font-semibold text-gray-800">{nama}</p>
        </div>
        <div>
          <h3 className="text-sm text-gray-500">NIM</h3>
          <p className="font-semibold text-gray-800">{nim}</p>
        </div>
        <div>
          <h3 className="text-sm text-gray-500">Angkatan</h3>
          <p className="font-semibold text-gray-800">{angkatan}</p>
        </div>
        <div className="md:col-span-2">
          <h3 className="text-sm text-gray-500">Program Studi</h3>
          <p className="font-semibold text-gray-800">{prodi}</p>
        </div>
      </div>
    </div>
  );
}