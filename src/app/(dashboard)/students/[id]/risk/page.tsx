"use client";

import { useParams, notFound } from "next/navigation";
import StudentsRiskView from "@/views/students/risk";

export default function RiskPage() {
  const params = useParams<{ id?: string }>();
  const id = params?.id;

  if (!id) {
    notFound();
  }

  return <StudentsRiskView studentId={id} />;
}
