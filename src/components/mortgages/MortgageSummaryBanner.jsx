"use client";

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/utils/formatting';
import { calculateAmortizationSchedule } from '@/utils/mortgageCalculator';

const MortgageSummaryBanner = ({ mortgageData }) => {
  const mortgage = mortgageData?.mortgage;
  const startingBalance = mortgage?.originalAmount || 0;

  let currentBalance = typeof mortgage?.currentBalance === 'number' && mortgage.currentBalance > 0
    ? mortgage.currentBalance
    : startingBalance;

  // Initialize with today's date (will be overwritten by schedule when available)
  let nextPaymentDate = new Date();
  let paymentAmount = mortgageData?.mortgage?.paymentAmount || 0;

  try {
    if (mortgage) {
      const schedule = calculateAmortizationSchedule(mortgage);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day

      // Find next payment on or after today
      // Parse dates as local dates (not UTC) to avoid timezone shift issues
      let nextPayment =
        schedule.payments.find(p => {
          // Parse YYYY-MM-DD as local date to avoid UTC timezone issues
          const [year, month, day] = p.paymentDate.split('-').map(Number);
          const paymentDate = new Date(year, month - 1, day);
          paymentDate.setHours(0, 0, 0, 0);
          return paymentDate >= today;
        }) ||
        schedule.payments[schedule.payments.length - 1];

      if (nextPayment) {
        // Parse YYYY-MM-DD as local date to avoid UTC timezone shift
        const [year, month, day] = nextPayment.paymentDate.split('-').map(Number);
        nextPaymentDate = new Date(year, month - 1, day);
        nextPaymentDate.setHours(0, 0, 0, 0);
        if (!paymentAmount) {
          paymentAmount = nextPayment.monthlyPayment;
        }

        // If we don't have an explicit current balance, use the balance
        // after the most recent completed payment.
        if (!(typeof mortgage?.currentBalance === 'number' && mortgage.currentBalance > 0)) {
          const idx = schedule.payments.findIndex(p => p === nextPayment);
          const previousPayment = idx > 0 ? schedule.payments[idx - 1] : null;
          if (previousPayment) {
            currentBalance = previousPayment.remainingBalance;
          } else {
            currentBalance = nextPayment.remainingBalance;
          }
        }
      }
    }
  } catch (e) {
    // Fallbacks already set above
  }

  const balancePaid = startingBalance - currentBalance;

  // Chart data for donut chart - using app's green color scheme
  const chartData = [
    { name: 'Current Balance', value: currentBalance, color: '#205A3E' },
    { name: 'Balance Paid', value: balancePaid, color: '#9CA3AF' }
  ];

  const today = new Date();
  let daysUntilPayment = 0;
  let paymentProgress = 0;

  if (nextPaymentDate) {
    daysUntilPayment = Math.ceil((nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Approximate progress between last and next payment for the bar
    try {
      const schedule = calculateAmortizationSchedule(mortgage);
      const idx = schedule.payments.findIndex(p => new Date(p.paymentDate).getTime() === nextPaymentDate.getTime());
      const previousPayment = idx > 0 ? schedule.payments[idx - 1] : null;
      if (previousPayment) {
        const lastDate = new Date(previousPayment.paymentDate).getTime();
        const nextDate = nextPaymentDate.getTime();
        const totalIntervalDays = (nextDate - lastDate) / (1000 * 60 * 60 * 24);
        const elapsedDays = (today.getTime() - lastDate) / (1000 * 60 * 60 * 24);
        paymentProgress = Math.max(0, Math.min(100, (elapsedDays / totalIntervalDays) * 100));
      }
    } catch {
      // If we can't compute a precise interval, fall back to a simple 14‑day assumption
      paymentProgress = Math.max(0, Math.min(100, (14 - daysUntilPayment) / 14 * 100));
    }
  }

  // Lump sum privilege data - use actual data if available
  const lumpSumPrivilege = mortgage?.lumpSumPrivilege || 98400;
  const lumpSumUsed = mortgage?.lumpSumUsed || 0;
  const lumpSumProgress = (lumpSumUsed / lumpSumPrivilege) * 100;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
        
        {/* Starting Balance Donut Chart */}
        <div className="flex items-center gap-4">
          <div className="w-32 h-32 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  dataKey="value"
                  startAngle={90}
                  endAngle={450}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Starting Balance</div>
                <div className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(startingBalance)}</div>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <div className="w-3 h-3 rounded-full bg-[#205A3E]"></div>
              <span>Current Balance</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span>Balance Paid</span>
            </div>
          </div>
        </div>

        {/* Current & Paid Balance */}
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Current Balance</div>
            <div className="text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(currentBalance)}</div>
          </div>
          <div className="text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Balance Paid</div>
            <div className="text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(balancePaid)}</div>
          </div>
        </div>

        {/* Payment Date & Amount */}
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Payment Date</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {nextPaymentDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{daysUntilPayment} days</div>
            <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${paymentProgress}%` }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Payment Amount</div>
            <div className="text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(paymentAmount)}</div>
          </div>
        </div>

        {/* Lump Sum Privilege */}
        <div className="space-y-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <span>Remaining Lump Sum Privilege Payment</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(lumpSumPrivilege)}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Used {formatCurrency(lumpSumUsed)}</div>
            <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${lumpSumProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Additional Info - could be used for more metrics */}
        <div className="hidden lg:block">
          {/* Reserved for additional metrics if needed */}
        </div>
      </div>
    </div>
  );
};

export default MortgageSummaryBanner;
