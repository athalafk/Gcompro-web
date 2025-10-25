// src/components/features/students/TranscriptTable.tsx
'use client';

import { useState, useMemo } from 'react';

type TranscriptItem = {
  semester_no: number;
  kode: string;
  nama: string;
  sks: number;
  nilai: string | null;
  status: string;
};

type Props = {
  data: TranscriptItem[];
};

// Ikon
const SearchIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24">
    <path 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" 
    />
  </svg>
);

export default function TranscriptTable({ data }: Props) {
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState<number>(0); // 0 = Semua Semester
  const [statusFilter, setStatusFilter] = useState(''); // "" = Semua Status

  // Dapatkan daftar semester unik dari data
  const semesters = useMemo(() => {
    const semSet = new Set(data.map(item => item.semester_no));
    return Array.from(semSet).sort((a, b) => a - b);
  }, [data]);

  // Filter data di sisi client
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = item.nama.toLowerCase().includes(search.toLowerCase());
      const matchesSemester = semester === 0 || item.semester_no === semester;
      const matchesStatus = statusFilter === '' || item.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesSemester && matchesStatus;
    });
  }, [data, search, semester, statusFilter]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Transkrip Nilai</h3>
      
      {/* --- Kontrol Filter --- */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        {/* Filter Semester */}
        <select
          value={semester}
          onChange={(e) => setSemester(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value={0}>Semua Semester</option>
          {semesters.map(sem => (
            <option key={sem} value={sem}>Semester {sem}</option>
          ))}
        </select>

        {/* Filter Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Semua Status</option>
          <option value="lulus">Lulus</option>
          <option value="tidak lulus">Tidak Lulus</option>
        </select>

        {/* Search Input */}
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Cari Mata Kuliah..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 w-full text-sm"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </div>
        </div>
      </div>

      {/* --- Tabel --- */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50">
            <tr>
              <th className="px-4 py-3">Semester</th>
              <th className="px-4 py-3">Kode MK</th>
              <th className="px-4 py-3">Nama Mata Kuliah</th>
              <th className="px-4 py-3">SKS</th>
              <th className="px-4 py-3">Nilai</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((item, index) => (
                <tr key={`${item.kode}-${index}`} className="border-b">
                  <td className="px-4 py-3">{item.semester_no}</td>
                  <td className="px-4 py-3 font-mono">{item.kode}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{item.nama}</td>
                  <td className="px-4 py-3">{item.sks}</td>
                  <td className="px-4 py-3 font-semibold">{item.nilai || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.status.toLowerCase() === 'lulus'
                        ? 'bg-green-100 text-green-700'
                        : item.status.toLowerCase() === 'tidak lulus'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.status || 'N/A'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-500">
                  Data tidak ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}