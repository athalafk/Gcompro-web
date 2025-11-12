"use client";
import React, { useMemo } from "react";
import type { CourseMapNode } from "@/models/types/students/risk";

// Tipe props untuk komponen baru kita
type CurriculumGridProps = {
  nodes: CourseMapNode[];
};

// --- Komponen Internal untuk Kartu Mata Kuliah ---
type CourseCardProps = {
  node: CourseMapNode;
  displayId: string; // ID unik (misal "1", "2", "3")
  prereqMap: Map<string, string>; // Map dari code (IF101) -> displayId ("2")
};

function CourseCard({ node, displayId, prereqMap }: CourseCardProps) {
  // 1. Tentukan Warna berdasarkan Status Kelulusan
  const { kelulusan } = node;
  let bgColor = "#E5E7EB"; // Belum Lulus (Abu-abu)/courses-map/route.ts]
  let borderColor = "#CBD5E1";
  let textColor = "#374151";

  if (kelulusan === "Lulus") {
    bgColor = "#D1FAE5"; // Lulus (Hijau)/courses-map/route.ts]
    borderColor = "#A7F3D0";
    textColor = "#065F46";
  } else if (kelulusan === "Tidak Lulus") {
    bgColor = "#FEE2E2"; // Gagal (Merah)/courses-map/route.ts]
    borderColor = "#FECACA";
    textColor = "#991B1B";
  }

  // 2. Buat daftar tag prasyarat (nomor-nomor di atas)
  const prereqTags = node.prereq
    .map((p) => prereqMap.get(p.code)) // Ubah code "IF101" menjadi displayId "2"
    .filter(Boolean) // Hapus jika ada prereq yang tidak ditemukan di map
    .sort((a, b) => Number(a) - Number(b)); // Urutkan nomor

  return (
    <div
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        color: textColor,
      }}
      className="border rounded-lg p-3 shadow-sm"
    >
      {/* Bagian Prasyarat (Nomor di atas) */}
      <div className="flex flex-wrap gap-1 mb-2 h-6">
        {prereqTags.map((tagId) => (
          <span
            key={tagId}
            className="flex items-center justify-center w-5 h-5 bg-gray-600 text-white text-xs font-bold rounded-full"
            title={`Prasyarat: Mata Kuliah #${tagId}`}
          >
            {tagId}
          </span>
        ))}
      </div>

      {/* Bagian Nama Mata Kuliah */}
      <div className="flex gap-2 items-center">
        <span className="font-bold text-sm">{displayId}</span>
        <span className="font-semibold text-sm leading-snug">{node.name}</span>
      </div>
      <div className="text-xs mt-1 opacity-70">{node.sks} SKS</div>
    </div>
  );
}

// --- Komponen Utama (Grid) ---
export default function CurriculumGrid({ nodes }: CurriculumGridProps) {
  // 1. Proses data sekali saja
  const { nodesBySemester, codeToDisplayId, maxSemester } = useMemo(() => {
    const codeMap = new Map<string, string>();
    const semesterMap = new Map<number, CourseMapNode[]>();
    let maxSem = 0;

    // Sortir node agar 'Display ID' konsisten
    // Urutkan berdasarkan semester, lalu nama MK
    const sortedNodes = [...nodes].sort((a, b) => {
      const semA = a.semester_plan ?? 99;
      const semB = b.semester_plan ?? 99;
      if (semA !== semB) return semA - semB;
      return a.name.localeCompare(b.name);
    });

    // Buat map 'code' -> 'Display ID' (misal: "IF101" -> "2")
    sortedNodes.forEach((node, index) => {
      // Kita gunakan index+1 sebagai Display ID (1, 2, 3, ...)
      codeMap.set(node.code, String(index + 1));
    });

    // Kelompokkan node berdasarkan semester untuk layout grid
    for (const node of sortedNodes) {
      // API mengembalikan 7 dan 8 untuk MK Pilihan/courses-map/route.ts]
      let semester = node.semester_plan ?? 0;

      // Jika semester_plan null atau 0 (mungkin MK Pilihan lama), coba tebak
      if (semester === 0 && node.mk_pilihan) {
        semester = 7; // Asumsikan MK Pilihan ada di semester 7
      }
      // Semua yang tidak punya semester (selain MK Pilihan) taruh di kolom 'Lainnya'
      else if (semester === 0) {
        semester = 9; // Kolom "Lainnya"
      }

      if (semester > maxSem && semester <= 8) maxSem = semester;

      if (!semesterMap.has(semester)) {
        semesterMap.set(semester, []);
      }
      semesterMap.get(semester)!.push(node);
    }

    // Pastikan kita setidaknya menampilkan 8 semester
    if (maxSem < 8) maxSem = 8;

    return {
      nodesBySemester: semesterMap,
      codeToDisplayId: codeMap,
      maxSemester: maxSem,
    };
  }, [nodes]);

  // Buat array semester (kolom)
  const semesters = Array.from({ length: maxSemester }, (_, i) => i + 1);
  const otherNodes = nodesBySemester.get(9) ?? []; // Kolom "Lainnya"

  return (
    <div className="w-full overflow-x-auto pb-4">
      {/* Container Grid: 
        - grid-cols-[repeat(X,minmax(220px,1fr))]
          Artinya: Buat X kolom, masing-masing min 220px, max 1fr (bagi rata)
      */}
      <div
        className="grid gap-5"
        style={{
          gridTemplateColumns: `repeat(${
            semesters.length + (otherNodes.length > 0 ? 1 : 0)
          }, minmax(220px, 1fr))`,
        }}
      >
        {/* Render Kolom Semester 1 s/d 8 */}
        {semesters.map((sem) => (
          <div key={sem} className="flex flex-col gap-4">
            <h3 className="font-bold text-lg text-gray-700 border-b-2 border-gray-300 pb-2">
              Semester {sem}
            </h3>
            <div className="flex flex-col gap-3">
              {(nodesBySemester.get(sem) ?? []).map((node) => (
                <CourseCard
                  key={node.code}
                  node={node}
                  displayId={codeToDisplayId.get(node.code) ?? "???"}
                  prereqMap={codeToDisplayId}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Render Kolom "Lainnya" jika ada */}
        {otherNodes.length > 0 && (
          <div key="other" className="flex flex-col gap-4">
            <h3 className="font-bold text-lg text-gray-500 border-b-2 border-gray-300 pb-2">
              Lainnya
            </h3>
            <div className="flex flex-col gap-3">
              {otherNodes.map((node) => (
                <CourseCard
                  key={node.code}
                  node={node}
                  displayId={codeToDisplayId.get(node.code) ?? "???"}
                  prereqMap={codeToDisplayId}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
