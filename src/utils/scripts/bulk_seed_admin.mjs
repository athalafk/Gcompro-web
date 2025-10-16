import 'dotenv/config';

// ====== CONFIG ======
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL_DOMAIN = process.env.NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN || 'campus.ac.id';

// besaran batch & concurrency
const PAGE_SIZE = 1000;   // ambil 1000 mahasiswa per page dari tabel students
const CONCURRENCY = 5;    // buat 5 request create user paralel
const DEFAULT_PASSWORD = '123456';

// ====== HELPERS ======
async function restGetStudents(offset = 0, limit = PAGE_SIZE) {
  // Ambil kolom minimal
  const url = `${SUPABASE_URL}/rest/v1/students?select=nim,nama&order=nim.asc`;
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Range: `${offset}-${offset + limit - 1}`,
    },
    cache: 'no-store',
  });
  if (!res.ok && res.status !== 206 && res.status !== 200) {
    const err = await safeJson(res);
    throw new Error(`Fetch students failed: ${res.status} ${JSON.stringify(err)}`);
  }
  return res.json();
}

async function adminCreateUser({ email, password, nim, full_name }) {
  const url = `${SUPABASE_URL}/auth/v1/admin/users`;
  const body = {
    email,
    password,
    email_confirm: true, // langsung verified
    user_metadata: { nim, full_name },
    app_metadata: { provider: 'email', providers: ['email'] }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await safeJson(res);
  if (res.ok) return { ok: true, data };

  // Supabase kadang mengembalikan 422 untuk user existing
  const msg = JSON.stringify(data);
  if (res.status === 422 && /user_exists|User already registered/i.test(msg)) {
    return { ok: true, skipped: true, reason: 'exists' };
  }

  // beberapa instalasi merespon 400 untuk email sudah ada
  if (res.status === 400 && /already registered|exists/i.test(msg)) {
    return { ok: true, skipped: true, reason: 'exists' };
  }

  return { ok: false, error: { status: res.status, data } };
}

async function safeJson(res) {
  try { return await res.json(); } catch { return { raw: await res.text().catch(() => null) }; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ====== CONCURRENCY QUEUE ======
async function processInBatches(items, handler, concurrency = CONCURRENCY) {
  const results = [];
  let idx = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const i = idx++;
      try {
        results[i] = await handler(items[i], i);
      } catch (e) {
        results[i] = { ok: false, error: e };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

// ====== MAIN ======
async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Missing SUPABASE URL or SERVICE KEY envs');
  }

  console.log('Seeding via Admin API...');
  let offset = 0;
  let totalCreated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  while (true) {
    const students = await restGetStudents(offset, PAGE_SIZE);
    if (!students.length) break;

    // mapping data
    const jobs = students.map(s => ({
      nim: String(s.nim).trim(),
      full_name: s.nama || '',
      email: `${String(s.nim).trim()}@${EMAIL_DOMAIN}`,
      password: DEFAULT_PASSWORD,
    }));

    // jalankan dengan concurrency + retry sederhana
    const results = await processInBatches(jobs, async (job) => {
      // retry 3x dengan backoff ringan
      for (let attempt = 1; attempt <= 3; attempt++) {
        const res = await adminCreateUser({
          email: job.email,
          password: job.password,
          nim: job.nim,
          full_name: job.full_name,
        });
        if (res.ok) return res;
        // rate limit / network → retry
        if (res.error && [429, 500, 502, 503, 504].includes(res.error.status)) {
          await sleep(300 * attempt);
          continue;
        }
        // error lain → stop
        return res;
      }
      return { ok: false, error: { status: 'retry_exhausted' } };
    }, CONCURRENCY);

    // akumulasi
    for (const r of results) {
      if (r?.ok && !r?.skipped) totalCreated++;
      else if (r?.ok && r?.skipped) totalSkipped++;
      else totalFailed++;
    }

    console.log(`Page offset ${offset}: created=${totalCreated}, skipped=${totalSkipped}, failed=${totalFailed}`);
    offset += PAGE_SIZE;

    // jeda antar page supaya adem
    await sleep(400);
  }

  console.log('Done. Summary:', { created: totalCreated, skipped: totalSkipped, failed: totalFailed });
}

main().catch(err => {
  console.error('Bulk seed failed:', err);
  process.exit(1);
});
