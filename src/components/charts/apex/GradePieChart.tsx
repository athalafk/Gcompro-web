// src/components/charts/apex/GradePieChart.tsx
'use client';

import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

type Props = {
  data: {
    labels: string[]; // ["A", "AB", "B", "BC", "C", "D", "E"]
    series: number[]; // [10, 4, 8, 2, 3, 0, 0]
  };
};

// Warna sesuai mockup
const chartColors = [
  '#10B981', // A (Hijau)
  '#0EA5E9', // B (Biru)
  '#F59E0B', // C (Oranye)
  '#EF4444', // D (Merah)
  '#8B5CF6', // AB? (Ungu - asumsi)
  '#6B7280', // BC? (Gray - asumsi)
  '#EC4899', // E? (Pink - asumsi)
];

// Data dari API Anda-statistic-chart-route.ts.ts] tidak sama persis dengan mockup. 
// API: ["A", "AB", "B", "BC", "C", "D", "E"]
// Mockup: ["A", "B", "C", "D", "E"]
// Kita akan ikuti API (7 irisan)
const customColors = [
  '#10B981', // A (Hijau)
  '#3B82F6', // AB (Biru Muda)
  '#0EA5E9', // B (Biru Tua)
  '#F59E0B', // BC (Kuning)
  '#EAB308', // C (Oranye)
  '#EF4444', // D (Merah)
  '#DC2626', // E (Merah Tua)
];


export default function GradePieChart({ data }: Props) {
  const options: ApexOptions = {
    chart: {
      id: 'grade-distribution-chart',
    },
    labels: data.labels,
    colors: customColors,
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      markers: {
      },
      itemMargin: {
        horizontal: 10,
      },
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
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 h-full shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribusi Nilai</h3>
      <div id="chart-pie">
        <Chart options={options} series={data.series} type="pie" height={350} />
      </div>
    </div>
  );
}