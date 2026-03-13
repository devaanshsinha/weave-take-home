"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface EngineerScoreChartProps {
  data: Array<{
    label: string;
    value: number;
  }>;
}

const chartColors = ["#ff7a59", "#ffd84d", "#74d3ae", "#77aaff"];

export function EngineerScoreChart({ data }: EngineerScoreChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 8, left: -16, bottom: 12 }}>
        <CartesianGrid stroke="#d1c6aa" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#111111", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "#111111", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "#f3ecdc" }}
          contentStyle={{
            borderRadius: 18,
            border: "2px solid #111111",
            boxShadow: "none",
            backgroundColor: "#fffdf7",
          }}
        />
        <Bar dataKey="value" radius={[10, 10, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={entry.label}
              fill={chartColors[index % chartColors.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
