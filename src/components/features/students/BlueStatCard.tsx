// src/components/features/students/BlueStatCard.tsx

import { SxProps, Theme } from "@mui/material/styles";
import TrendingUp from "@mui/icons-material/TrendingUp";     // Untuk IPS / IPK
import TrackChanges from "@mui/icons-material/TrackChanges"; // Untuk Total SKS (Target)
import Check from "@mui/icons-material/Check";             // Untuk SKS Selesai
import Layers from "@mui/icons-material/Layers";           // Untuk SKS Tertinggal (Stack)

const iconStyle: SxProps<Theme> = {
  fontSize: "2rem",
  color: "#0B3C6F",
};

// --- MODIFIKASI 3: Ganti map ikon untuk menggunakan komponen MUI ---
const icons: Record<string, React.ReactNode> = {
  IPS: <TrendingUp sx={iconStyle} />,
  IPK: <TrendingUp sx={iconStyle} />,
  "Total SKS": <TrackChanges sx={iconStyle} />,
  "SKS Selesai": <Check sx={iconStyle} />,
  "SKS Tertinggal": <Layers sx={iconStyle} />,
};

type Props = {
  title: string;
  value: string | number;
};

export default function BlueStatCard({ title, value }: Props) {
  return (
    // Latar belakang gradien #0B3C6F -> #4A7AAE
    <div className="bg-gradient-to-r from-[#0B3C6F] to-[#4A7AAE] text-white rounded-2xl p-5 shadow-lg">
      <div className="flex items-center space-x-4">
        {/* Lingkaran ikon 'bg-white' */}
        <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center bg-white rounded-full">
          {icons[title] || <TrackChanges sx={iconStyle} />}
        </div>
        <div>
          {/* Teks 'text-white' */}
          <h3 className="text-base font-medium text-white">{title}</h3>
          <p className="text-4xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}