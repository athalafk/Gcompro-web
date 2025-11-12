// src/views/admin/StudentListView.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Button, // <-- 1. Impor Tombol
} from '@mui/material';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';

import { listStudents } from '@/services/students';
import type { StudentsListParams } from '@/services/students';

// --- 2. Impor context ---
import { useProfileContext } from '@/contexts/profile-context';

// ... (Tipe Data, Placeholder, Kolom... JANGAN UBAH 'columns' DULU) ...
type StudentItem = {
  id: string;
  nim: string;
  nama: string;
  prodi: string;
  angkatan: number;
};
const prodiOptions = [
  'S1 Teknik Telekomunikasi',
  'S1 Teknik Elektro',
  'S1 Teknik Komputer',
  'S1 Teknik Biomedis',
];
const angkatanOptions = [2020, 2021, 2022, 2023, 2024];

// Hook useDebounce ...
function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function StudentListView() {
  // ... (Semua state Anda: rows, loading, prodi, angkatan, dll... tetap sama) ...
  const [rows, setRows] = useState<StudentItem[]>([]);
  const [totalRowCount, setTotalRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [prodi, setProdi] = useState('');
  const [angkatan, setAngkatan] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'nim', sort: 'asc' },
  ]);

  // --- 3. Dapatkan context ---
  const { adminSelectedStudentId, setAdminStudentId } = useProfileContext();

  // ... (useEffect Anda untuk fetchData tetap sama) ...
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const params: StudentsListParams = {
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        sortBy: (sortModel[0]?.field as StudentsListParams['sortBy']) || 'nim',
        sortDir: sortModel[0]?.sort || 'asc',
      };
      if (prodi) params.prodi = prodi;
      if (angkatan) params.angkatan = parseInt(angkatan);
      if (debouncedSearch) params.search = debouncedSearch;
      
      try {
        const data = await listStudents(params);
        setRows(data.items as StudentItem[]); 
        setTotalRowCount(data.total);
      } catch (error) {
        console.error(error);
        setRows([]);
        setTotalRowCount(0);
      } finally {
        setLoading(false);
      }
    }
    void fetchData();
  }, [paginationModel, sortModel, prodi, angkatan, debouncedSearch]);

  // --- 4. Tentukan kolom Data Grid DI SINI ---
  const columns: GridColDef[] = [
    { field: 'nim', headerName: 'NIM', width: 130 },
    { field: 'nama', headerName: 'Nama', flex: 1, minWidth: 200 },
    { field: 'prodi', headerName: 'Program Studi', flex: 1, minWidth: 200 },
    { field: 'angkatan', headerName: 'Angkatan', width: 100 },
    {
      field: 'actions',
      headerName: 'Aksi',
      width: 120,
      sortable: false,
      renderCell: (params) => {
        const { row } = params;
        const isActive = adminSelectedStudentId === row.id;

        const handleViewClick = () => {
          if (isActive) {
            // Jika mengklik yang sudah aktif, batalkan
            setAdminStudentId(null);
            sessionStorage.removeItem("admin:selectedStudentName");
            sessionStorage.removeItem("admin:selectedStudentNIM");
            sessionStorage.removeItem("admin:selectedStudentProdi");
          } else {
            // Set ID di context
            setAdminStudentId(row.id);
            
            // Simpan detail di sessionStorage (untuk dibaca oleh layout)
            sessionStorage.setItem("admin:selectedStudentName", row.nama);
            sessionStorage.setItem("admin:selectedStudentNIM", row.nim);
            sessionStorage.setItem("admin:selectedStudentProdi", row.prodi);
          }
        };

        return (
          <Button
            variant={isActive ? "contained" : "outlined"}
            size="small"
            onClick={handleViewClick}
          >
            {isActive ? "Viewing" : "View"}
          </Button>
        );
      },
    },
  ];
  // --- AKHIR DEFINISI KOLOM ---

  return (
    <Box component="main" sx={{ p: 3, flexGrow: 1 }}>
      {/* ... (Header dan Paper Anda tetap sama) ... */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <h1 className="text-2xl font-semibold text-gray-800">Dashboard Admin</h1>
        <div className="text-right">
          <h2 className="text-xl font-bold text-blue-800">SIPANDAI</h2>
          <p className="text-xs text-gray-500">
            Sistem Informasi Pemantauan Data Akademik Integratif
          </p>
        </div>
      </Box>
      <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid #E0E0E0' }}>
        {/* ... (Baris Filter Anda tetap sama) ... */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
          {/* Filter Program Studi */}
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Program Studi</InputLabel>
            <Select
              value={prodi}
              label="Program Studi"
              onChange={(e) => setProdi(e.target.value)}
            >
              <MenuItem value="">
                <em>Semua Program Studi</em>
              </MenuItem>
              {prodiOptions.map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* Filter Angkatan */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Angkatan</InputLabel>
            <Select
              value={angkatan}
              label="Angkatan"
              onChange={(e) => setAngkatan(e.target.value.toString())}
            >
              <MenuItem value="">
                <em>Semua Angkatan</em>
              </MenuItem>
              {angkatanOptions.map((a) => (
                <MenuItem key={a} value={a}>{a}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* Search Bar */}
          <TextField
            size="small"
            placeholder="Cari NIM atau Nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ ml: 'auto', minWidth: 300 }}
          />
        </Box>

        {/* --- 5. Gunakan 'columns' yang baru saja kita definisikan --- */}
        <Box sx={{ height: 650, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns} // <-- Gunakan variabel 'columns'
            getRowId={(row) => row.id}
            rowCount={totalRowCount}
            loading={loading}
            paginationMode="server"
            sortingMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 20, 50]}
            sortModel={sortModel}
            onSortModelChange={setSortModel}
            sx={{ border: 'none' }}
          />
        </Box>
      </Paper>
    </Box>
  );
}