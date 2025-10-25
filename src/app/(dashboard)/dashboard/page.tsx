"use client";

import { notFound, useParams } from "next/navigation";
import StudentsOverview from "@/views/students/overview";
// ⬇️ import hook dari layout (sesuaikan path jika perlu)
import { useProfileContext } from "@/app/(dashboard)/layout";

export default function StudentsOverviewPage() {
  const params = useParams<{ id?: string }>();
  const routeId = params?.id as string | undefined;

  const { studentId, loading } = useProfileContext();

  // Jika tidak ada routeId, tunggu context selesai fetch
  if (!routeId) {
    if (loading) {
      // Skeleton/filler ringan biar konsisten dengan sidebar
      return (
        <div className="p-4">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
        </div>
      );
    }
    if (!studentId) {
      // Tidak ada id di URL dan context tidak punya studentId -> 404
      notFound();
    }
  }

  const effectiveId = routeId ?? (studentId as string);

  return <StudentsOverview studentId={effectiveId} />;
}