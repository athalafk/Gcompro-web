"use client";

import { notFound } from "next/navigation";
import { useProfileContext } from "@/contexts/profile-context";
import LoadingSpinner from "@/components/loading/loading-spinner";
import RiskAnalysisView from "@/views/students/risk-analysis";

export default function StudentRiskPage() {
  const { studentId, loading } = useProfileContext();

  if (loading) {
    return <LoadingSpinner message="Memuat Profil..." />;
  }

  if (!studentId) {
    notFound();
  }

  return <RiskAnalysisView studentId={studentId!} />;
}
