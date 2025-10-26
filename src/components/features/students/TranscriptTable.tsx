// src/components/features/students/TranscriptTable.tsx
'use client';

import { useState, useMemo } from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Select, MenuItem, InputBase } from '@mui/material';

type TranscriptItem = {
  semester_no: number;
  kode: string;
  nama: string;
  sks: number;
  nilai: string | null;
  status: string;
};

type Props = {
  data: TranscriptItem[];
};

const SearchIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24">
    <path 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" 
    />
  </svg>
);

function renderStatusCell(params: GridRenderCellParams) {
  const status = (params.value as string)?.toLowerCase() || '';
  const isLulus = status === 'lulus';
  const isTidakLulus = status === 'tidak lulus';

  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-600';

  if (isLulus) {
    bgColor = 'bg-green-100';
    textColor = 'text-green-700';
  } else if (isTidakLulus) {
    bgColor = 'bg-red-100';
    textColor = 'text-red-700';
  }

  return (
    <Box 
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
    >
      {params.value || 'N/A'}
    </Box>
  );
}

const columns: GridColDef[] = [
  {
    field: 'semester_no',
    headerName: 'Semester',
    width: 100,
  },
  {
    field: 'kode',
    headerName: 'Kode MK',
    width: 130,
    renderCell: (params) => (
      <span className="font-mono">{params.value}</span>
    ),
  },
  {
    field: 'nama',
    headerName: 'Nama Mata Kuliah',
    flex: 1,
    minWidth: 250,
  },
  {
    field: 'sks',
    headerName: 'SKS',
    type: 'number',
    width: 80,
    align: 'left',
    headerAlign: 'left',
  },
  {
    field: 'nilai',
    headerName: 'Nilai',
    width: 90,
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 150,
    renderCell: renderStatusCell,
  },
];

export default function TranscriptTable({ data }: Props) {
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState('');

  const semesters = useMemo(() => {
    const semSet = new Set(data.map(item => item.semester_no));
    return Array.from(semSet).sort((a, b) => a - b);
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = item.nama.toLowerCase().includes(search.toLowerCase());
      const matchesSemester = semester === 0 || item.semester_no === semester;
      const matchesStatus = statusFilter === '' || item.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesSemester && matchesStatus;
    });
  }, [data, search, semester, statusFilter]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Transkrip Nilai</h3>
      
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <Select
          value={semester}
          onChange={(e) => setSemester(Number(e.target.value))}
          displayEmpty
          className="border border-gray-300 rounded-lg text-sm bg-white"
          sx={{
            height: '42px',
            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
          }}
        >
          <MenuItem value={0}>Semua Semester</MenuItem>
          {semesters.map(sem => (
            <MenuItem key={sem} value={sem}>Semester {sem}</MenuItem>
          ))}
        </Select>

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as string)}
          displayEmpty
          className="border border-gray-300 rounded-lg text-sm bg-white"
          sx={{
            height: '42px',
            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
          }}
        >
          <MenuItem value="">Semua Status</MenuItem>
          <MenuItem value="lulus">Lulus</MenuItem>
          <MenuItem value="tidak lulus">Tidak Lulus</MenuItem>
        </Select>

        <div className="relative flex-grow">
          <InputBase
            placeholder="Cari Mata Kuliah..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 w-full text-sm bg-white"
            sx={{ height: '42px' }}
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </div>
        </div>
      </div>

      <Box sx={{ width: '100%' }}>
        <DataGrid
          rows={filteredData}
          columns={columns}
          getRowId={(row) => `${row.semester_no}-${row.kode}`}
          
          pageSizeOptions={[10]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          disableRowSelectionOnClick
          sx={{ border: 'none' }} 
        />
      </Box>
    </div>
  );
}