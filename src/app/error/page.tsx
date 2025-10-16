import ErrorView from "@/views/error/error";

export default function ErrorPage({
  searchParams,
}: {
  searchParams: { code?: string; message?: string };
}) {
  const code = searchParams.code ? Number(searchParams.code) : undefined;
  const message = searchParams.message || undefined;

  return <ErrorView code={code} message={message} />;
}
