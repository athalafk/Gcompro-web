import RegisterSentView from "@/views/register/register-sent";

export default function RegisterSentPage({ searchParams }: { searchParams: { email?: string } }) {
  return (
    <RegisterSentView email={searchParams.email} />
  );
}