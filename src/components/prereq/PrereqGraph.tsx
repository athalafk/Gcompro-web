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
const { nodesBySemester, codeToDisplayId, maxSemester } = useMemo(() => {
  const semesterMapRaw = new Map<number, CourseMapNode[]>();
  const codeMap = new Map<string, string>();
  let maxSem = 0;

  // 1) Kelompokkan dulu per semester (tanpa peduli urutan)
  for (const node of nodes) {
    let semester = node.semester_plan ?? 0;

    if (semester === 0 && node.mk_pilihan) {
      semester = 7;
    } else if (semester === 0) {
      semester = 9;
    }

    if (semester > maxSem && semester <= 8) maxSem = semester;

    if (!semesterMapRaw.has(semester)) {
      semesterMapRaw.set(semester, []);
    }
    semesterMapRaw.get(semester)!.push(node);
  }

  if (maxSem < 8) maxSem = 8;

  const isPlaceholder = (code: string) => /^MK_PILIHAN\d+$/i.test(code);

  // 2) Urutkan isi tiap semester:
  const orderedSemesterMap = new Map<number, CourseMapNode[]>();

  semesterMapRaw.forEach((list, sem) => {
    const regular = list
      .filter((n) => !n.mk_pilihan)
      .sort((a, b) => a.name.localeCompare(b.name));

    const realMkPilihan = list
      .filter((n) => n.mk_pilihan && !isPlaceholder(n.code))
      .sort((a, b) => a.name.localeCompare(b.name));

    const placeholder = list
      .filter((n) => n.mk_pilihan && isPlaceholder(n.code))
      // kalau mau, boleh urutkan berdasar angka di belakang
      .sort((a, b) => {
        const numA = Number(a.code.replace(/\D+/g, "")) || 0;
        const numB = Number(b.code.replace(/\D+/g, "")) || 0;
        return numA - numB;
      });

    orderedSemesterMap.set(sem, [...regular, ...realMkPilihan, ...placeholder]);
  });

  // 3) Kasih nomor displayId sesuai urutan visual:
  let counter = 1;
  for (let sem = 1; sem <= maxSem; sem++) {
    const list = orderedSemesterMap.get(sem) ?? [];
    for (const node of list) {
      codeMap.set(node.code, String(counter++));
    }
  }
  const otherList = orderedSemesterMap.get(9) ?? [];
  for (const node of otherList) {
    codeMap.set(node.code, String(counter++));
  }

  return {
    nodesBySemester: orderedSemesterMap,
    codeToDisplayId: codeMap,
    maxSemester: maxSem,
  };
}, [nodes]);

  const semesters = Array.from({ length: maxSemester }, (_, i) => i + 1);
  const otherNodes = nodesBySemester.get(9) ?? [];

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
