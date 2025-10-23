/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Profil pengguna yang sedang login
 *     description: |
 *       Mengembalikan profil berdasarkan sesi Supabase saat ini.
 *       - Jika **role=admin** → bentuk `ProfileAdmin`
 *       - Jika **role=student** → bentuk `ProfileStudent`
 *       - Membaca `profiles` dan, untuk student, melookup `students` berdasarkan `nim`.
 *     tags: [Auth]
 *     operationId: getMyProfile
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ProfileAdmin'
 *                 - $ref: '#/components/schemas/ProfileStudent'
 *             examples:
 *               admin:
 *                 summary: Respon ketika role=admin
 *                 value:
 *                   full_name: "Administrator"
 *                   role: "admin"
 *               student:
 *                 summary: Respon ketika role=student
 *                 value:
 *                   id: "9f9a4212-0761-482d-8b01-a20c35f2010d"
 *                   full_name: "Alice Rahmawati"
 *                   role: "student"
 *                   nim: "13519001"
 *                   prodi: "Teknik Telekomunikasi"
 *               student_without_match:
 *                 summary: Student profile ada, tapi tidak ditemukan di tabel students (id/prodi null)
 *                 value:
 *                   id: null
 *                   full_name: "Budi Santoso"
 *                   role: "student"
 *                   nim: "13519002"
 *                   prodi: null
 *       401:
 *         description: Unauthorized (tidak ada sesi Supabase).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               no_session:
 *                 value: { error: "Unauthorized" }
 *       404:
 *         description: Profile tidak ditemukan untuk user ini.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               not_found:
 *                 value: { error: "Profile not found" }
 *       400:
 *         description: Role tidak didukung.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               bad_role:
 *                 value: { error: "Unsupported role: xyz" }
 *       500:
 *         description: Kesalahan server (gagal getUser / query Supabase).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               db_error:
 *                 value: { error: "relation profiles does not exist" }
 *
 * components:
 *   schemas:
 *     ProfileAdmin:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         full_name:
 *           type: string
 *           nullable: true
 *         role:
 *           type: string
 *           enum: [admin]
 *       required: [role]
 *
 *     ProfileStudent:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: ID dari tabel `students` (bisa null jika NIM tidak ditemukan di students).
 *         full_name:
 *           type: string
 *           nullable: true
 *         role:
 *           type: string
 *           enum: [student]
 *         nim:
 *           type: string
 *         prodi:
 *           type: string
 *           nullable: true
 *       required: [role, nim]
 *
 *     ErrorResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         error:
 *           type: string
 *       required: [error]
 */


export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type ProfileStudent = {
  id: string;
  full_name: string | null;
  role: "student";
  nim: string;
  prodi: string | null;
};

type ProfileAdmin = {
  full_name: string | null;
  role: "admin";
};

export async function GET(_req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
  if (!user)   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("full_name, role, nim")
    .eq("id", user.id)
    .single();

  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const role = String(profile.role);

  if (role === "admin") {
    const res: ProfileAdmin = {
      full_name: profile.full_name ?? null,
      role: "admin",
    };
    return NextResponse.json(res, { status: 200 });
  }

  if (role === "student") {
    const nim = profile.nim;
    if (!nim) {
      return NextResponse.json({ error: "NIM is missing for student profile" }, { status: 500 });
    }

    const { data: student, error: stuErr } = await supabase
      .from("students")
      .select("id, prodi")
      .eq("nim", nim)
      .maybeSingle();

    if (stuErr) return NextResponse.json({ error: stuErr.message }, { status: 500 });

    const res: ProfileStudent = {
      id: student?.id ?? null,
      full_name: profile.full_name ?? null,
      role: "student",
      nim,
      prodi: student?.prodi ?? null,
    };
    return NextResponse.json(res, { status: 200 });
  }

  return NextResponse.json(
    { error: `Unsupported role: ${role}` },
    { status: 400 }
  );
}
