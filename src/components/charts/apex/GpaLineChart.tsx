// src/components/charts/apex/GpaLineChart.tsx
'use client';

import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

// ApexCharts perlu di-load secara dinamis di Next.js
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

type Props = {
  data: {
    categories: number[];
    series: Array<{ name: string; data: (number | null)[] }>;
  };
};

export default function GpaLineChart({ data }: Props) {
  // Ubah kategori semester menjadi string "Smt 1", "Smt 2", dst.
  const categories = data.categories.map(sem => `Semester ${sem}`);

  const options: ApexOptions = {
    chart: {
      id: 'gpa-trend-chart',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ['#3B82F6', '#F59E0B'],
    markers: {
      size: 5,
      colors: ['#FFFFFF'],
      fillOpacity: 1,
      strokeWidth: 3,
      strokeColors: ['#3B82F6', '#F59E0B'],
      strokeOpacity: 1,
      hover: { size: 8, sizeOffset: 2 },
    },
    stroke: {
      width: 3,
      curve: 'smooth',
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: categories,
      labels: {
        style: {
          colors: '#6B7280', // text-gray-500
        },
      },
    },
    yaxis: {
      min: 0,
      max: 4.0,
      tickAmount: 4,
      labels: {
        style: {
          colors: '#6B7280', // text-gray-500
        },
        formatter: (val) => val.toFixed(1),
      },
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'left',
      offsetY: 8,
      markers: {
      },
      itemMargin: {
        horizontal: 20,
      },
    },
    tooltip: {
      y: {
        formatter: (val) => val.toFixed(2),
      },
    },
  };

  // Ganti nama "IPK" -> "IPK (Indeks Prestasi Kumulatif)"
  const series = data.series.map(s => ({
    ...s,
    name: s.name === "IPK" 
      ? "IPK (Indeks Prestasi Kumulatif)" 
      : "IPS (Indeks Prestasi Semester)",
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 h-full shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Perkembangan IPK</h3>
      <div id="chart">
        <Chart options={options} series={series} type="line" height={350} />
      </div>
    </div>
  );
}