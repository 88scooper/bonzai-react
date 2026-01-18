"use client";

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/utils/formatting';

const AnnualExpenseChart = ({ expenseHistory = [] }) => {
  // Process expense history data
  const chartData = useMemo(() => {
    if (!expenseHistory || expenseHistory.length === 0) return [];

    // Group expenses by year
    const yearlyData = {};
    
    expenseHistory.forEach(expense => {
      const year = new Date(expense.date).getFullYear().toString();
      
      if (!yearlyData[year]) {
        yearlyData[year] = {
          year,
          'Property Tax': 0,
          'Insurance': 0,
          'Condo Fees': 0,
          'Maintenance': 0,
          'Other': 0,
          total: 0
        };
      }
      
      // Add amount to the appropriate category
      yearlyData[year][expense.category] += expense.amount;
      yearlyData[year].total += expense.amount;
    });

    // Convert to array and sort by year
    return Object.values(yearlyData).sort((a, b) => a.year.localeCompare(b.year));
  }, [expenseHistory]);

  // Define colors for each category
  const categoryColors = {
    'Property Tax': '#ef4444',      // Red
    'Insurance': '#3b82f6',         // Blue
    'Condo Fees': '#f59e0b',        // Amber
    'Maintenance': '#10b981',       // Emerald
    'Other': '#8b5cf6'              // Violet
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = data.total;
      
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{`Year: ${label}`}</p>
          <div className="space-y-1">
            {payload.map((entry, index) => {
              const category = entry.dataKey;
              const amount = entry.value;
              const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
              
              return (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-gray-700 dark:text-gray-300">{category}:</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(amount)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {percentage}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
            <div className="flex justify-between font-semibold text-gray-900 dark:text-white">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="text-lg font-medium">No Expense Data Available</div>
          <div className="text-sm">Add expense records to see the chart</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="year" 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#9ca3af' }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#9ca3af' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            formatter={(value) => value}
            wrapperStyle={{ paddingTop: '20px' }}
          />
          
          {/* Render bars for each category */}
          <Bar 
            dataKey="Property Tax" 
            stackId="a" 
            fill={categoryColors['Property Tax']}
            name="Property Tax"
            isAnimationActive={true}
            animationBegin={300}
            animationDuration={1400}
            animationEasing="ease-in-out"
          />
          <Bar 
            dataKey="Insurance" 
            stackId="a" 
            fill={categoryColors['Insurance']}
            name="Insurance"
            isAnimationActive={true}
            animationBegin={300}
            animationDuration={1400}
            animationEasing="ease-in-out"
          />
          <Bar 
            dataKey="Condo Fees" 
            stackId="a" 
            fill={categoryColors['Condo Fees']}
            name="Condo Fees"
            isAnimationActive={true}
            animationBegin={300}
            animationDuration={1400}
            animationEasing="ease-in-out"
          />
          <Bar 
            dataKey="Maintenance" 
            stackId="a" 
            fill={categoryColors['Maintenance']}
            name="Maintenance"
            isAnimationActive={true}
            animationBegin={300}
            animationDuration={1400}
            animationEasing="ease-in-out"
          />
          <Bar 
            dataKey="Other" 
            stackId="a" 
            fill={categoryColors['Other']}
            name="Other"
            isAnimationActive={true}
            animationBegin={300}
            animationDuration={1400}
            animationEasing="ease-in-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnnualExpenseChart;
