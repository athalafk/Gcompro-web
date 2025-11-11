export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getApiDocs } from '@/lib/swagger';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import ReactSwaggerView from '@/views/docs/react-swagger';

export default async function DocsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) {
    redirect('/error?code=500');
  }
  if (!user) {
    redirect('/login');
  }

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profErr) {
    redirect('/error?code=500');
  }
  if ((profile?.role ?? null) !== 'admin') {
    redirect('/error?code=403');
  }

  const spec = await getApiDocs();
  return (
    <section className="container py-6">
      <ReactSwaggerView spec={spec} />
    </section>
  );
}
