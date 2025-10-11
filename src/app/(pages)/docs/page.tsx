export const dynamic = "force-dynamic";

import { getApiDocs } from "@/lib/swagger";
import ReactSwaggerView from "@/views/docs/react-swagger";

export default async function IndexPage() {
  const spec = await getApiDocs();
  return (
    <section className="container">
      <ReactSwaggerView spec={spec} />
    </section>
  );
}