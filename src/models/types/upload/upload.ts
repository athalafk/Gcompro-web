/** Tipe untuk baris data grade yang di-parse dari CSV (di /api/upload/grades) */
export type GradeRow = {
  nim: string;
  kode: string;
  semester_no: string | number;
  tahun_ajaran: string;
  grade_index: "A"|"B"|"C"|"D"|"E";
  sks: string | number;
};

/** Tipe untuk hasil respons API Upload (/api/upload/grades) */
export type UploadResult = {
    ok: boolean;
    parsed: number;
    inserted: number;
    skipped_students: number;
    skipped_courses: number;
    samples: {
      missing_students: any[];
      missing_courses: any[];
    };
};