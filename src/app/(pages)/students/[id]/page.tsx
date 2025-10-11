export const dynamic = "force-dynamic";

import StudentsOverview from "@/views/students/overview";

export default async function StudentsOverviewPage(
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  return <StudentsOverview studentId={id} />;
}