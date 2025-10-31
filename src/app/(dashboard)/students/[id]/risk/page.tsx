// src/app/(dashboard)/students/[id]/risk/page.tsx
"use client";

import { notFound, useParams } from "next/navigation";
import { useProfileContext } from "@/app/(dashboard)/layout";
import RiskAnalysisView from "@/views/students/risk-analysis";

export default function StudentRiskPage() {
  const params = useParams<{ id?: string }>();
  const routeId = params?.id as string | undefined;

  const { studentId, loading } = useProfileContext();

  if (!routeId) {
    if (loading) {
      return (
        <div className="p-4">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
        </div>
      );
    }
    if (!studentId) {
      notFound();
    }
  }

  const effectiveId = routeId ?? (studentId as string);

  return <RiskAnalysisView studentId={effectiveId} />;
}