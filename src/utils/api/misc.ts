// utils/api/misc.ts

/** Cek UUID v4-ish (longgar, cukup untuk guard route param) */
export const isUuidLike = (s: string) => /^[0-9a-fA-F-]{32,36}$/.test(s)

/** Semester format validator: "Ganjil YYYY/YYYY" atau "Genap YYYY/YYYY" */
export function isValidSemesterFormat(v: unknown): v is string {
  if (typeof v !== 'string') return false
  return /^ *(Ganjil|Genap) +\d{4}\/\d{4} *$/i.test(v.trim())
}

/** Parse semester string → { nomor: 1|2, tahun_ajaran: "YYYY/YYYY" } */
export function parseSemester(input: string): { nomor: 1 | 2; tahun_ajaran: string } {
  const raw = input.trim()
  const isGanjil = /^Ganjil/i.test(raw)
  const isGenap  = /^Genap/i.test(raw)
  const tahun = raw.match(/(\d{4}\/\d{4})/)?.[1]
  if (!tahun || (!isGanjil && !isGenap)) {
    throw new Error("Format semester tidak valid (contoh: 'Ganjil 2021/2022' atau 'Genap 2021/2022').")
  }
  return { nomor: isGanjil ? 1 : 2, tahun_ajaran: tahun }
}

/** Join URL aman (hindari double slash) */
export function joinUrl(base: string, path: string) {
  const b = (base || '').replace(/\/+$/g, '')
  const p = (path || '').replace(/^\/+/g, '')
  return `${b}/${p}`
}

/** Fetch dengan timeout (AbortController) */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), init.timeoutMs ?? 15000)
  try {
    const res = await fetch(input, { ...init, signal: controller.signal })
    return res
  } finally {
    clearTimeout(t)
  }
}

/** Parse number aman (default fallback) */
export function toNumber(v: unknown, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/** Pagination guard: page 1-based, pageSize dibatasi */
export function parsePagination(
  pageRaw: unknown,
  pageSizeRaw: unknown,
  defaults = { page: 1, pageSize: 20, maxPageSize: 100 }
) {
  const page = Math.max(1, Math.floor(toNumber(pageRaw, defaults.page)))
  const size = Math.min(
    defaults.maxPageSize,
    Math.max(1, Math.floor(toNumber(pageSizeRaw, defaults.pageSize)))
  )
  const from = (page - 1) * size
  const to = from + size - 1
  return { page, pageSize: size, from, to }
}

/** Sorting guard: limit ke field yang diizinkan + arah asc/desc */
export function parseSorting<T extends string>(
  sortByRaw: unknown,
  sortDirRaw: unknown,
  allowed: readonly T[],
  defaultField: T,
  defaultDir: 'asc' | 'desc' = 'asc'
) {
  const field = (typeof sortByRaw === 'string' && allowed.includes(sortByRaw as T))
    ? (sortByRaw as T)
    : defaultField

  const dir = (typeof sortDirRaw === 'string' && sortDirRaw.toLowerCase() === 'desc') ? 'desc' : defaultDir
  return { sortBy: field, sortDir: dir as 'asc' | 'desc' }
}

/** Optional: ETag sederhana dari JSON untuk 304 revalidate */
export async function etagFromJSON(obj: unknown) {
  // gunakan Web Crypto jika tersedia (Edge/Node 18+)
  const json = JSON.stringify(obj)
  if ('crypto' in globalThis && 'subtle' in globalThis.crypto) {
    const enc = new TextEncoder().encode(json)
    const buf = await crypto.subtle.digest('SHA-1', enc)
    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
    return `W/"${hex}"`
  }
  // fallback ringan (non-cryptographic)
  const hash = [...json].reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0) >>> 0
  return `W/"${hash.toString(16)}"`
}
