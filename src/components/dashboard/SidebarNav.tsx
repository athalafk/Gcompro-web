// src/components/dashboard/SidebarNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Placeholder Ikon
const StatistikIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4.5V19a.5.5 0 0 0 .5.5h15"
    />
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 12.5v5m4-9.5v9m4-6.5v6"
    />
  </svg>
);
const RisikoIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11.278 2.213a1 1 0 0 1 1.444 0l9.042 10.978a1 1 0 0 1-.722 1.622H2.958a1 1 0 0 1-.722-1.622L11.278 2.213Z"
    />
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8.9v4.2m0 3.6v.1"
    />
  </svg>
);
const PetaIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 2a4 4 0 0 0-4 4v.1c0 2.2 1.8 4.7 4 7.4 2.2-2.7 4-5.2 4-7.4V6a4 4 0 0 0-4-4Zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"
    />
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 16.3c.3-1 .8-1.8 1.4-2.5m1.1 2.5c.3-1 .8-1.8 1.4-2.5m-9.4 6.7h13M5 19.3c.3-1 .8-1.8 1.4-2.5m11.1 2.5c.3-1 .8-1.8 1.4-2.5"
    />
  </svg>
);

export default function SidebarNav({ studentId }: { studentId: string | null }) {
  const pathname = usePathname();

  // Jika studentId tidak ada, jangan render link
  if (!studentId) return null;

  const navLinks = [
    {
      // Ini adalah halaman Statistik Akademik dari mockup Anda
      href: `/dashboard`,
      text: "Statistik Akademik",
      icon: <StatistikIcon />,
    },
    {
      // Ini adalah halaman Analisis Risiko dari mockup Anda
      href: `/students/${studentId}/risk`,
      text: "Analisis Risiko",
      icon: <RisikoIcon />,
    },
    // { 
    //   href: `/students/${studentId}/map`, 
    //   text: "Peta Mata Kuliah", 
    //   icon: <PetaIcon /> 
    // },
  ];

  return (
    <ul>
      {navLinks.map((link) => {
        // Cek jika link adalah root statistik atau halaman lain
        const isActive =
          link.href === `/students/${studentId}`
            ? pathname === link.href
            : pathname.startsWith(link.href);

        return (
          <li key={link.href} className="mb-2">
            <Link
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-2 transition-colors ${
                isActive
                  ? "bg-[#D9E0E6] text-[#0A2D4F] font-bold"
                  : "hover:bg-blue-900"
              }`}
            >
              {link.icon}
              <span>{link.text}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}