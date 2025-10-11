"use client";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { GpaTrendRow } from "@/app/models/types/students/students";

export default function GpaTrend({ data }: { data: GpaTrendRow[] }) {
  return (
    <div className="h-72 w-full rounded-2xl border p-4 pb-8">
      <h3 className="font-semibold mb-2">Tren IPK & IPS per Semester</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 32, left: 12 }}
        >
          <XAxis dataKey="semester_no" />
          <YAxis domain={[0, 4]} />
          <Tooltip />
          <Legend
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            height={28}
            wrapperStyle={{ paddingTop: 8 }}
          />
          {/* IPS = biru, IPK = hijau */}
          <Line type="monotone" dataKey="ips" name="IPS" dot stroke="#3B82F6" strokeWidth={2} />
          <Line type="monotone" dataKey="ipk_cum" name="IPK" dot stroke="#22C55E" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
