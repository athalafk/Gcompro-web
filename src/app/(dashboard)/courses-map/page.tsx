"use client";

import { notFound } from "next/navigation";
import { useProfileContext } from "@/contexts/profile-context";
import LoadingSpinner from "@/components/loading/loading-spinner";
import PrereqMapViews from "@/views/students/courses-map-view"; // Kita akan buat file view ini

export default function StudentMapPage() {
  const { studentId, loading } = useProfileContext();

  if (loading) {
    return <LoadingSpinner message="Memuat Profil..." />;
  }

  if (!studentId) {
    notFound();
  }

  return <PrereqMapViews studentId={studentId!} />;
}
