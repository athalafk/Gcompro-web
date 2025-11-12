"use client";

import { notFound } from "next/navigation";
import StudentsOverview from "@/views/students/overview";
import { useProfileContext } from "@/contexts/profile-context";
import LoadingSpinner from "@/components/loading/loading-spinner";

export default function StudentsOverviewPage() {

  const { studentId, loading } = useProfileContext();

  if (loading) {
    return (
    <LoadingSpinner message="Memuat Profile..." />
    );
  } else {
    if (!studentId) {
      notFound();
    }
  }

  return <StudentsOverview studentId={studentId!} />;
}
