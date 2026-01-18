"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const ProgressRing = ({ current, total, size = 96, color = "#205A3E" }) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const remaining = Math.max(0, total - current);
  
  // Use different colors for light/dark mode - we'll handle this with CSS classes
  // For now, use light gray that will work in both modes
  const remainingColor = '#E5E7EB'; // Light gray for light mode
  
  const chartData = [
    { name: 'Paid', value: current, color },
    { name: 'Remaining', value: remaining, color: remainingColor }
  ];
  
  const innerRadius = size / 2 - 6;
  const outerRadius = size / 2;
  
  return (
    <div className="h-24 w-24 relative flex-shrink-0" style={{ width: `${size}px`, height: `${size}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey="value"
            startAngle={90}
            endAngle={450}
            isAnimationActive={true}
            animationDuration={1400}
            animationEasing="ease-in-out"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
          {percentage}%
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-0.5">
          PAID
        </div>
      </div>
    </div>
  );
};

export default ProgressRing;
