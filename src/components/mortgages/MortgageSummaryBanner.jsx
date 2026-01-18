"use client";

import React from 'react';
import { formatCurrency } from '@/utils/formatting';
import { calculateAmortizationSchedule } from '@/utils/mortgageCalculator';
import ProgressRing from '@/components/shared/ProgressRing';

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

  const today = new Date();
  let daysUntilPayment = 0;

  if (nextPaymentDate) {
    daysUntilPayment = Math.ceil((nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Lump sum privilege data - use actual data if available
  const lumpSumPrivilege = mortgage?.lumpSumPrivilege || 98400;
  const lumpSumUsed = mortgage?.lumpSumUsed || 0;

  return (
    <div className="bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 border-l-4 border-[#205A3E] rounded-xl overflow-hidden shadow-sm p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        
        {/* Column 1: Visual Status */}
        <div className="flex flex-col items-center gap-4 border-r border-slate-100 dark:border-gray-800 pr-8">
          <ProgressRing 
            current={balancePaid} 
            total={startingBalance} 
            size={96} 
            color="#205A3E" 
          />
          <div className="space-y-1 text-center">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Balance Paid
              </div>
              <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {formatCurrency(balancePaid)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Remaining
              </div>
              <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {formatCurrency(currentBalance)}
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Immediate Action */}
        <div className="space-y-4 border-r border-slate-100 dark:border-gray-800 pr-8">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1">
              Next Payment
            </div>
            <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {nextPaymentDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {daysUntilPayment} days remaining
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1">
              Payment Amount
            </div>
            <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {formatCurrency(paymentAmount)}
            </div>
          </div>
        </div>

        {/* Column 3: Strategy */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1">
              <span>Lump Sum Privilege</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {formatCurrency(lumpSumPrivilege)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Used {formatCurrency(lumpSumUsed)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MortgageSummaryBanner;
