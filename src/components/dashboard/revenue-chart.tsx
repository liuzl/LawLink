"use client";

import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import { revenueTrend } from "@/lib/mock-data";

export function RevenueChart() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.45 }}
      className="ll-surface flex h-full flex-col"
    >
      <header className="flex items-center justify-between px-5 pb-3 pt-4">
        <div>
          <h2 className="font-display text-lg italic tracking-tight">近 6 个月实收趋势</h2>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <Legend color="hsl(var(--primary))" label="实收" thick />
          <Legend color="hsl(var(--muted-foreground))" label="应收" />
        </div>
      </header>

      <div className="ll-hairline-t flex-1 p-2 pt-3">
        <ResponsiveContainer width="100%" height="100%" minHeight={240}>
          <AreaChart data={revenueTrend} margin={{ top: 10, right: 16, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="received-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="receivable-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.12} />
                <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="2 4"
              stroke="hsl(var(--hairline))"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{
                fill: "hsl(var(--muted-foreground))",
                fontSize: 11,
                fontFamily: "var(--font-mono)"
              }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis
              tick={{
                fill: "hsl(var(--muted-foreground))",
                fontSize: 11,
                fontFamily: "var(--font-mono)"
              }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: 12,
                boxShadow: "var(--shadow-medium)"
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Area
              type="monotone"
              dataKey="receivable"
              name="应收"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.2}
              strokeDasharray="3 3"
              fill="url(#receivable-fill)"
            />
            <Area
              type="monotone"
              dataKey="received"
              name="实收"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#received-fill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}

function Legend({
  color,
  label,
  thick
}: {
  color: string;
  label: string;
  thick?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block rounded-full"
        style={{
          width: thick ? "14px" : "12px",
          height: thick ? "2px" : "1px",
          background: color
        }}
      />
      {label}
    </span>
  );
}
