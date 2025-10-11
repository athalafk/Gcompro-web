import StudentsRiskView from "@/views/students/risk";

export default function RiskPage({ params }: { params: { id: string } }) {
  const { id } = params;
  
  return <StudentsRiskView studentId={id} />;
}