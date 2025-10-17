"use client";

import { notFound, useParams } from "next/navigation";
import StudentsOverview from "@/views/students/overview";

export default function StudentsOverviewPage() {
  const params = useParams<{ id?: string }>();
  const id = params?.id;

  if (!id) {
    notFound();
  }
  return <StudentsOverview studentId={id} />;
}
