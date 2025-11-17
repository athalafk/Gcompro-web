// src/components/charts/apex/GradePieChart.tsx
'use client';

import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
// Pastikan import dari MUI ini ada
import { Select, MenuItem } from '@mui/material';

// Load ApexCharts secara dinamis
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// --- PERBAIKAN: Definisi Props harus lengkap ---
type Props = {
  data: {
    labels: string[];
    series: number[];
  };
  // Properti baru untuk filter
  semesterOptions: number[];
  selectedSemester: number;
  onSemesterChange: (sem: number) => void;
};

// Warna chart
const customColors = [
  '#10B981', // A (Hijau)
  '#3B82F6', // AB (Biru Muda)
  '#0EA5E9', // B (Biru Tua)
  '#F59E0B', // BC (Kuning/Oranye)
  '#EAB308', // C (Oranye)
  '#EF4444', // D (Merah)
  '#DC2626', // E (Merah Tua)
];

// --- PERBAIKAN: Destructure props di sini agar variabelnya bisa dipakai ---
export default function GradePieChart({ 
  data, 
  semesterOptions, 
  selectedSemester, 
  onSemesterChange 
}: Props) {
  
  const options: ApexOptions = {
    chart: {
      id: 'grade-distribution-chart',
      fontFamily: 'inherit',
    },
    labels: data.labels,
    colors: customColors,
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      itemMargin: { horizontal: 10 },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(0)}%`,
    },
    tooltip: {
      y: {
        formatter: (val) => `${val} Matkul`,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '0%',
        }
      }
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 h-full shadow-sm flex flex-col">
      {/* Header dengan Judul dan Filter */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Distribusi Nilai</h3>
        
        {/* Dropdown Filter */}
        <Select
          value={selectedSemester}
          // Menggunakan Number() untuk memastikan tipe data benar
          onChange={(e) => onSemesterChange(Number(e.target.value))}
          size="small"
          displayEmpty
          sx={{
            height: 36,
            fontSize: '0.875rem',
            bgcolor: '#F9FAFB',
            borderRadius: '8px',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#E5E7EB',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#D1D5DB',
            },
          }}
        >
          <MenuItem value={0}>Semua Semester</MenuItem>
          {/* Mapping semesterOptions */}
          {semesterOptions.map((sem) => (
            <MenuItem key={sem} value={sem}>Semester {sem}</MenuItem>
          ))}
        </Select>
      </div>

      {/* Area Chart */}
      <div id="chart-pie" className="flex-grow flex items-center justify-center">
        {/* Handle jika data kosong (semua series 0) */}
        {data.series.every(v => v === 0) ? (
          <div className="text-gray-400 text-sm text-center py-10">
            Tidak ada data nilai untuk semester ini.
          </div>
        ) : (
          <Chart options={options} series={data.series} type="pie" height={320} width="100%" />
        )}
      </div>
    </div>
  );
}