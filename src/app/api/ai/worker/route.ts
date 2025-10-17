import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { extractFeatures } from "@/lib/features";

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/?/, "");
  return `${b}/${p}`;
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

// === Throttle & Retry config ===
const BATCH_LIMIT = parseInt(process.env.WORKER_BATCH_LIMIT || "100", 10);
const MIN_DELAY_MS = parseInt(process.env.WORKER_MIN_DELAY_MS || "350", 10);
const JITTER_MS = parseInt(process.env.WORKER_JITTER_MS || "100", 10);
const BASE_BACKOFF_SEC = parseInt(process.env.WORKER_BASE_BACKOFF_SEC || "30", 10);
const MAX_BACKOFF_MIN = parseInt(process.env.WORKER_MAX_BACKOFF_MIN || "60", 10);
const WORKER_TOKEN = process.env.WORKER_TOKEN;
const AI_URL_BASE = process.env.AI_BASE_URL || "";
const AI_ENDPOINT = joinUrl(AI_URL_BASE, "predict/");

function nextBackoffMs(attempts: number): number {
  const secs = Math.min(BASE_BACKOFF_SEC * Math.pow(2, Math.max(0, attempts - 1)), MAX_BACKOFF_MIN * 60);
  return secs * 1000;
}

function mapRiskForDb(label: string): "HIGH" | "MED" | "LOW" {
  const L = (label || "").toLowerCase();
  if (L.includes("tinggi")) return "HIGH";
  if (L.includes("sedang")) return "MED";
  return "LOW";
}
function mapRiskToCluster(label: string): number {
  const L = (label || "").toLowerCase();
  if (L.includes("tinggi")) return 2;
  if (L.includes("sedang")) return 1;
  return 0;
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Auth sederhana
  const token = req.headers.get("x-worker-token");
  if (!WORKER_TOKEN || token !== WORKER_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const supabase = createAdminClient();

  // Ambil job pending yang sudah due
  const { data: jobs, error: jobErr } = await supabase
    .from("ai_jobs")
    .select("id, student_id, attempts")
    .eq("status", "pending")
    .lte("next_run_at", new Date().toISOString())
    .order("next_run_at", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (jobErr) {
    return NextResponse.json({ error: "Failed to fetch jobs", details: jobErr.message }, { status: 500 });
  }
  if (!jobs?.length) {
    return NextResponse.json({ ok: true, processed: 0, message: "No pending jobs ready." });
  }

  if (dry) {
    return NextResponse.json({ ok: true, dry: true, queued: jobs.length, preview: jobs.slice(0, 5) });
  }

  let processed = 0;

  for (const job of jobs) {
    const jobId = job.id as string;
    const studentId = job.student_id as string;

    // mark processing
    await supabase.from("ai_jobs").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", jobId);

    try {
      // 1) Fitur baru
      const feat = await extractFeatures(studentId);

      // 2) Call AI
      const aiRes = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(feat),
      });
      const raw = await aiRes.text();

      if (!aiRes.ok) {
        const attempts = (job.attempts ?? 0) + 1;
        if (aiRes.status === 429 || aiRes.status >= 500) {
          const retryAfter = aiRes.headers.get("retry-after");
          const retryMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 0;
          const backoff = Math.max(retryMs, nextBackoffMs(attempts));
          await supabase.from("ai_jobs").update({
            status: "pending",
            attempts,
            next_run_at: new Date(Date.now() + backoff).toISOString(),
            last_error: `HF ${aiRes.status}. Backoff ${Math.round(backoff/1000)}s`,
            updated_at: new Date().toISOString(),
          }).eq("id", jobId);
        } else {
          await supabase.from("ai_jobs").update({
            status: "error",
            attempts,
            last_error: `HF ${aiRes.status}: ${raw.slice(0,200)}`,
            updated_at: new Date().toISOString(),
          }).eq("id", jobId);
        }
      } else {
        let ai: { prediction: string; probabilities?: Record<string, number> };
        try { ai = JSON.parse(raw); }
        catch {
          const attempts = (job.attempts ?? 0) + 1;
          const backoff = nextBackoffMs(attempts);
          await supabase.from("ai_jobs").update({
            status: "pending",
            attempts,
            next_run_at: new Date(Date.now() + backoff).toISOString(),
            last_error: "AI response not JSON",
            updated_at: new Date().toISOString(),
          }).eq("id", jobId);
          // throttle tetap jalan
          const jitter = Math.floor(Math.random() * JITTER_MS);
          await sleep(MIN_DELAY_MS + jitter);
          continue;
        }

        // 3) Inline save → ml_features & advice

        // a) Ambil IPS per semester utk delta_ips & semester terakhir mahasiswa
        const { data: vsss } = await supabase
          .from("v_student_semester_scores")
          .select("semester_id, semester_no, ips")
          .eq("student_id", studentId)
          .order("semester_no", { ascending: true });

        const ipsList = (vsss ?? []).map((r) => Number(r.ips ?? 0));
        const deltaIps = ipsList.length >= 2 ? ipsList[ipsList.length - 1] - ipsList[ipsList.length - 2] : 0;
        const lastRow = (vsss ?? []).at(-1);
        const semesterIdForSave: string | null = (lastRow?.semester_id as any) ?? null;

        // b) UPSERT ml_features
        const { error: upsertErr } = await supabase.from("ml_features").upsert(
          {
            student_id: studentId,
            semester_id: semesterIdForSave,

            gpa_cum: feat.IPK_Terakhir,
            ips_last: feat.IPS_Terakhir,
            delta_ips: deltaIps,
            mk_gagal_total: feat.Jumlah_MK_Gagal,
            sks_tunda: feat.Total_SKS_Gagal,

            pct_d: 0,
            pct_e: 0,
            repeat_count: 0,
            mk_prasyarat_gagal: 0,

            cluster_label: mapRiskToCluster(ai.prediction),
            risk_level: mapRiskForDb(ai.prediction), // HIGH|MED|LOW
            distance: 0,
          },
          { onConflict: "student_id,semester_id" }
        );
        if (upsertErr) throw upsertErr;

        // c) INSERT advice (label asli + probs tersortir)
        const reasonsPayload: Record<string, any> = { source_label: ai.prediction };
        if (ai.probabilities) {
          const sorted = Object.entries(ai.probabilities).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
          reasonsPayload.probabilities = sorted;
        }

        const { error: adviceErr } = await supabase.from("advice").insert({
          student_id: studentId,
          semester_id: semesterIdForSave,
          risk_level: ai.prediction, // simpan label asli
          reasons: reasonsPayload,
          actions: { info: "To be generated by rule-based/LLM later" },
        });
        if (adviceErr) throw adviceErr;

        // d) Tandai done
        await supabase.from("ai_jobs").update({
          status: "done",
          last_error: null,
          updated_at: new Date().toISOString(),
        }).eq("id", jobId);

        processed++;
      }

      // throttle
      const jitter = Math.floor(Math.random() * JITTER_MS);
      await sleep(MIN_DELAY_MS + jitter);
    } catch (e: any) {
      // error lokal → retry
      const attempts = (job.attempts ?? 0) + 1;
      const backoff = nextBackoffMs(attempts);
      await supabase.from("ai_jobs").update({
        status: "pending",
        attempts,
        next_run_at: new Date(Date.now() + backoff).toISOString(),
        last_error: (e?.message || "error").slice(0, 300),
        updated_at: new Date().toISOString(),
      }).eq("id", jobId);

      const jitter = Math.floor(Math.random() * JITTER_MS);
      await sleep(MIN_DELAY_MS + jitter);
    }
  }

  return NextResponse.json({ ok: true, processed, batch: jobs.length });
}
