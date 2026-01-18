"use client";

import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ChevronDown, ChevronUp, Calendar, Edit2 } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/utils/formatting';
import { calculateAmortizationSchedule } from '@/utils/mortgageCalculator';
import AmortizationSchedule from './AmortizationSchedule';

const MortgageCardView = ({ mortgage, onEdit }) => {
  const [showAmortizationSchedule, setShowAmortizationSchedule] = useState(false);
  const [showMortgageDetails, setShowMortgageDetails] = useState(false);
  const [showCompleteScheduleModal, setShowCompleteScheduleModal] = useState(false);
  const [showMortgageChart, setShowMortgageChart] = useState(false);
  // Calculate mortgage data
  const mortgageData = useMemo(() => {
    if (!mortgage) return null;
    
    try {
      // Use the mortgage object directly, or fallback to nested mortgage
      const mortgageObj = mortgage.mortgage || mortgage;
      const schedule = calculateAmortizationSchedule(mortgageObj);
      const now = new Date();
      const startDate = new Date(mortgageObj.startDate);

      // Find the next payment in the schedule based on today's date
      // Parse dates as local dates (not UTC) to avoid timezone shift issues
      const todayNormalized = new Date(now);
      todayNormalized.setHours(0, 0, 0, 0);
      
      let nextPaymentIndex = schedule.payments.findIndex(payment => {
        // Parse YYYY-MM-DD as local date to avoid UTC timezone issues
        const [year, month, day] = payment.paymentDate.split('-').map(Number);
        const paymentDate = new Date(year, month - 1, day);
        paymentDate.setHours(0, 0, 0, 0);
        return paymentDate >= todayNormalized;
      });

      if (nextPaymentIndex === -1) {
        // All payments are in the past – fall back to the final payment
        nextPaymentIndex = schedule.payments.length - 1;
      }

      const currentPayment = schedule.payments[nextPaymentIndex] || schedule.payments[0];

      // Determine current balance:
      // 1) Prefer an explicit currentBalance field from the mortgage (e.g., Richmond RMG statement)
      // 2) Otherwise use the balance after the most recent completed payment
      // 3) Fallback to the schedule balance or original amount
      let currentBalance = typeof mortgageObj.currentBalance === 'number' && mortgageObj.currentBalance > 0
        ? mortgageObj.currentBalance
        : undefined;

      if (currentBalance === undefined) {
        const previousPayment = nextPaymentIndex > 0 ? schedule.payments[nextPaymentIndex - 1] : null;
        if (previousPayment) {
          currentBalance = previousPayment.remainingBalance;
        } else {
          currentBalance = currentPayment?.remainingBalance || mortgageObj.originalAmount;
        }
      }

      const principalPaid = mortgageObj.originalAmount - currentBalance;

      // Total interest paid up to today based on schedule dates
      const totalInterestPaid = schedule.payments
        .filter(payment => new Date(payment.paymentDate) < now)
        .reduce((sum, payment) => sum + payment.interest, 0);
      
      // Calculate term remaining
      const termEndDate = mortgageObj.renewalDate
        ? new Date(mortgageObj.renewalDate)
        : (() => {
            const d = new Date(startDate);
            d.setFullYear(d.getFullYear() + (mortgage.termYears || mortgageObj.termYears));
            return d;
          })();
      const termRemainingMs = termEndDate - now;
      const termRemainingYears = Math.floor(termRemainingMs / (365.25 * 24 * 60 * 60 * 1000));
      const termRemainingMonths = Math.floor((termRemainingMs % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
      
      // Use the schedule's payment date for the next payment
      // Parse YYYY-MM-DD as local date to avoid UTC timezone shift
      const nextPaymentDate = currentPayment
        ? (() => {
            const [year, month, day] = currentPayment.paymentDate.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            date.setHours(0, 0, 0, 0);
            return date;
          })()
        : new Date(now);
      
      const daysUntilPayment = Math.ceil((nextPaymentDate - now) / (1000 * 60 * 60 * 24));
      
      // Calculate renewal date remaining (current date to renewal date)
      const renewalDate = termEndDate;
      const renewalRemainingMs = renewalDate - now;
      const renewalRemainingYears = Math.floor(renewalRemainingMs / (365.25 * 24 * 60 * 60 * 1000));
      const renewalRemainingMonths = Math.floor((renewalRemainingMs % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
      
      return {
        schedule: schedule.payments,
        currentBalance,
        principalPaid,
        totalInterestPaid,
        monthsElapsed: nextPaymentIndex, // approximate timeline position
        totalPayments: schedule.payments.length,
        monthlyPayment: currentPayment?.monthlyPayment || schedule.payments[0]?.monthlyPayment || 0,
        termRemaining: `${termRemainingYears} Years ${termRemainingMonths} Months`,
        renewalRemaining: `${renewalRemainingYears} Years ${renewalRemainingMonths} Months`,
        renewalDate,
        nextPaymentDate,
        daysUntilPayment,
        paymentProgress: Math.max(0, Math.min(100, (14 - daysUntilPayment) / 14 * 100))
      };
    } catch (error) {
      console.error('Error calculating mortgage data:', error);
      return null;
    }
  }, [mortgage]);

  if (!mortgageData || !mortgage) return null;

  const mortgageObj = mortgage.mortgage || mortgage;
  const startingBalance = mortgageObj.originalAmount;
  const currentBalance = mortgageData.currentBalance;
  const balancePaid = mortgageData.principalPaid;
  const monthlyPayment = mortgageData.monthlyPayment;
  const principalAmount = monthlyPayment * 0.6; // Approximate principal portion
  const interestAmount = monthlyPayment * 0.4; // Approximate interest portion

  // Donut chart data for balance - using improved color scheme
  const balanceChartData = [
    { name: 'Current Balance', value: currentBalance, color: '#6B7280' },
    { name: 'Balance Paid', value: balancePaid, color: '#FFFFFF' }
  ];

  // Donut chart data for payment breakdown - using improved color scheme
  const paymentChartData = [
    { name: 'Principal', value: principalAmount, color: '#205A3E' },
    { name: 'Interest', value: interestAmount, color: '#F3F4F6' }
  ];

  // Calculate yearly mortgage chart data for bar chart (scoped to term period only)
  const yearlyChartData = useMemo(() => {
    if (!mortgageData || !mortgageData.schedule || mortgageData.schedule.length === 0) return [];
    
    const mortgageObj = mortgage.mortgage || mortgage;
    const startDate = new Date(mortgageObj.startDate);
    const startYear = startDate.getFullYear();
    
    // Get term end date (renewal date)
    const termEndDate = mortgageData.renewalDate ? new Date(mortgageData.renewalDate) : null;
    if (!termEndDate) return [];
    
    // Group payments by year and get the last payment of each year
    // Only include payments within the term period
    const yearData = {};
    
    let cumulativeInterest = 0;
    let cumulativePrincipal = 0;
    
    // Process all payments and track cumulative values
    // Filter to only include payments within the term period
    mortgageData.schedule.forEach(payment => {
      const paymentDate = new Date(payment.paymentDate);
      
      // Only process payments up to and including the term end date
      if (paymentDate > termEndDate) {
        return;
      }
      
      const paymentYear = paymentDate.getFullYear();
      
      cumulativeInterest += payment.interest || 0;
      cumulativePrincipal += payment.principal || 0;
      
      // Store/update the year's data with the latest payment's values
      // This ensures we capture the last payment of each year
      yearData[paymentYear] = {
        year: paymentYear,
        balance: payment.remainingBalance || 0,
        totalInterestPaid: cumulativeInterest,
        totalPrincipalPaid: cumulativePrincipal,
        totalCost: startingBalance + cumulativeInterest
      };
    });
    
    // Ensure we have the starting year with initial values
    if (!yearData[startYear]) {
      yearData[startYear] = {
        year: startYear,
        balance: startingBalance,
        totalInterestPaid: 0,
        totalPrincipalPaid: 0,
        totalCost: startingBalance
      };
    }
    
    // Sort years and create array
    const sortedYears = Object.keys(yearData).map(Number).sort((a, b) => a - b);
    
    // Filter out years beyond term end
    const termEndYear = termEndDate.getFullYear();
    const filteredYears = sortedYears.filter(year => year <= termEndYear);
    
    // Convert to array - show all years within the term period
    return filteredYears.map(year => yearData[year]);
  }, [mortgageData, mortgage, startingBalance]);

  const InfoIcon = () => (
    <svg className="w-4 h-4 text-[#205A3E] dark:text-[#4ade80]" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  );

  // Extract short property name from address
  const getShortPropertyName = () => {
    const address = mortgage.property?.address || mortgage.propertyName || '';
    if (address.includes(',')) {
      const parts = address.split(',');
      const streetPart = parts[0].trim();
      // Remove unit number if present (e.g., "500-415 " from "500-415 Wilson Avenue")
      const match = streetPart.match(/\d+[-\s]+\d+[-\s]+(.+)/) || streetPart.match(/\d+[-\s]+(.+)/) || [null, streetPart];
      return match[1]?.trim() || streetPart;
    }
    return address || 'Mortgage';
  };

  return (
    <div className="space-y-6">
      {/* Mortgage Banner Card - Two-Tier Architecture */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white shadow-sm transition-all duration-300 hover:shadow-md">
        
        {/* Header Section - Property Identity */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-slate-50/50 dark:bg-slate-900/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {getShortPropertyName()}
              </h3>
            </div>
          </div>
        </div>
        
        {/* Financial Banner Section - Gradient Background */}
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 dark:from-emerald-950 dark:to-emerald-900 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            
            {/* Left Section - Balance Overview with Donut Chart */}
            <div className="flex items-center gap-3 border-r border-white/10 pr-8">
              <div className="flex-shrink-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-white/90">Starting Balance</div>
                <div className="text-xs font-semibold tabular-nums text-white">{formatCurrency(startingBalance)}</div>
              </div>
              <div className="relative flex-shrink-0" style={{ width: '74px', height: '74px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={balanceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={18}
                    outerRadius={33}
                    dataKey="value"
                    startAngle={90}
                    endAngle={450}
                    stroke="none"
                    strokeWidth={0}
                    isAnimationActive={true}
                    animationBegin={300}
                    animationDuration={1400}
                    animationEasing="ease-in-out"
                  >
                    {balanceChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
              <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gray-400 shadow-sm flex-shrink-0"></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-white/90">Current Balance</div>
                  <div className="font-semibold tabular-nums text-white text-[11px] sm:text-xs">{formatCurrency(currentBalance)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white shadow-sm flex-shrink-0"></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-white/90">Balance Paid</div>
                  <div className="font-semibold tabular-nums text-white text-[11px] sm:text-xs">{formatCurrency(balancePaid)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Section - Next Payment with Amount */}
          <div className="space-y-2 text-center border-r border-white/10 pr-8">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/90 mb-1">Next Payment</div>
              <div className="text-base font-semibold text-white mb-0.5">
                {mortgageData.nextPaymentDate.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
              <div className="text-sm text-white/80 mb-1">{mortgageData.daysUntilPayment} days remaining</div>
              <div className="text-sm font-semibold tabular-nums text-white">
                {formatCurrency(mortgageData.monthlyPayment)}
              </div>
            </div>
          </div>

          {/* Right Section - Payment Breakdown */}
          <div className="space-y-2">
          <div className="text-left">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-white/90 mb-1">
              Total Monthly Payment
            </div>
            <div className="text-base font-semibold tabular-nums text-white">
              {mortgageObj.paymentFrequency?.toLowerCase() === 'bi-weekly'
                ? formatCurrency(monthlyPayment * 26 / 12)
                : formatCurrency(monthlyPayment)}
            </div>
            {mortgageObj.paymentFrequency?.toLowerCase() === 'bi-weekly' && (
              <div className="text-[10px] font-medium text-white/80 mt-0.5">
                Bi-weekly
              </div>
            )}
          </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0"></div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-white/90">
                    {mortgageObj.paymentFrequency?.toLowerCase() === 'bi-weekly'
                      ? 'Principal (bi-weekly)'
                      : 'Principal'}
                  </div>
                  <div className="font-semibold tabular-nums text-white text-xs">{formatCurrency(principalAmount)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-white/30 flex-shrink-0"></div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-white/90">
                    {mortgageObj.paymentFrequency?.toLowerCase() === 'bi-weekly'
                      ? 'Interest (bi-weekly)'
                      : 'Interest'}
                  </div>
                  <div className="font-semibold tabular-nums text-white text-xs">{formatCurrency(interestAmount)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Mortgage & Payment Details - Single Dropdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-black/10 dark:border-white/10">
        <button
          onClick={() => setShowMortgageDetails(!showMortgageDetails)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Mortgage & Payment Details
          </h3>
          {showMortgageDetails ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {showMortgageDetails && (
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column - Mortgage Details */}
              <div className="space-y-5">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Mortgage Information</h4>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Property Address</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-right max-w-[60%]">{mortgage.property?.address || mortgage.propertyName || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Lender</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{mortgage.lenderName || mortgageObj.lender}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Amortization Period</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{Math.floor(mortgage.amortizationPeriodYears || mortgageObj.amortizationYears)} Years 0 Months</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Rate</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{mortgage.interestRate || (mortgageObj.interestRate * 100)}%</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Term</span>
                    <InfoIcon />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">{mortgage.termYears || (mortgageObj.termMonths / 12)} Years</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {new Date(mortgage.startDate || mortgageObj.startDate).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Renewal Date</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {mortgageData.renewalDate.toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Product</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{mortgage.rateType || mortgageObj.rateType}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Type</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{mortgage.paymentFrequency || mortgageObj.paymentFrequency}</span>
                </div>
              </div>

              {/* Right Column - Payment Details */}
              <div className="space-y-6">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Payment Information</h4>
                
                {/* Original Loan Amount */}
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Original Loan Amount</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(mortgage.originalAmount || mortgageObj.originalAmount)}</span>
                </div>

                {/* Payment Components */}
                <div className="space-y-4">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {mortgageObj.paymentFrequency === 'Bi-weekly' ? 'Bi-weekly Payment Components' : 'Monthly Payment Components'}
                  </h5>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Principal and Interest</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(monthlyPayment)}</span>
                    </div>
                    {mortgageObj.paymentFrequency === 'Bi-weekly' && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Equivalent</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(monthlyPayment * 26 / 12)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Property Tax</span>
                      <span className="font-semibold text-gray-900 dark:text-white">-</span>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="space-y-4">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white">Additional Details</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Frequency</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{mortgage.paymentFrequency || mortgageObj.paymentFrequency}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Remaining Amortization</span>
                        <InfoIcon />
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {mortgageObj.remainingAmortization
                          ? mortgageObj.remainingAmortization
                          : `${Math.max(0, Math.floor((mortgage.amortizationPeriodYears || mortgageObj.amortizationYears) - Math.floor(mortgageData.monthsElapsed / 12)))} Years ${Math.max(0, Math.floor(mortgageData.monthsElapsed % 12))} Months`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Term Remaining</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{mortgageData.renewalRemaining}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Amortization Schedule Dropdown */}
      <div className="mt-6">
        <button
          onClick={() => setShowAmortizationSchedule(!showAmortizationSchedule)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 rounded-xl border border-black/10 dark:border-white/10"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Amortization Schedule
          </h3>
          {showAmortizationSchedule ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        
        {showAmortizationSchedule && (
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Schedule</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Payment #</th>
                      <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Date</th>
                      <th className="text-right py-2 font-medium text-gray-700 dark:text-gray-300">Principal</th>
                      <th className="text-right py-2 font-medium text-gray-700 dark:text-gray-300">Interest</th>
                      <th className="text-right py-2 font-medium text-gray-700 dark:text-gray-300">Total</th>
                      <th className="text-right py-2 font-medium text-gray-700 dark:text-gray-300">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mortgageData.schedule.slice(0, 12).map((payment, index) => (
                      <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-2 text-gray-900 dark:text-white">{payment.paymentNumber}</td>
                        <td className="py-2 text-gray-600 dark:text-gray-400">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="text-right py-2 text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(payment.principal)}
                        </td>
                        <td className="text-right py-2 text-red-600 dark:text-red-400">
                          {formatCurrency(payment.interest)}
                        </td>
                        <td className="text-right py-2 font-medium text-gray-900 dark:text-white">
                          {formatCurrency(payment.monthlyPayment)}
                        </td>
                        <td className="text-right py-2 text-gray-600 dark:text-gray-400">
                          {formatCurrency(payment.remainingBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {mortgageData.schedule.length > 12 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Showing first 12 of {mortgageData.schedule.length} payments
                    </p>
                    <button
                      onClick={() => setShowCompleteScheduleModal(true)}
                      className="px-4 py-2 bg-[#205A3E] text-white rounded-lg hover:bg-[#2d7a5a] transition-colors text-sm"
                    >
                      View Complete Schedule
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mortgage Chart Dropdown */}
      <div className="mt-6">
        <button
          onClick={() => setShowMortgageChart(!showMortgageChart)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 rounded-xl border border-black/10 dark:border-white/10"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Year Over Year Payment Chart
          </h3>
          {showMortgageChart ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        
        {showMortgageChart && (
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden p-6">
            {yearlyChartData.length > 0 ? (
              <>
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {mortgage.termYears || (mortgageObj.termMonths ? Math.round(mortgageObj.termMonths / 12) : 5)} Year Term Mortgage Numbers
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {mortgageObj.interestRate ? (mortgageObj.interestRate * 100).toFixed(2) : mortgage.interestRate?.toFixed(2) || 0}% Interest on {formatCurrency(startingBalance)} loan (no Escrows)
                  </p>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={yearlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="year" 
                      stroke="#6b7280"
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      tick={{ fill: '#6b7280' }}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                        return `$${value}`;
                      }}
                    />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                    />
                    <Bar 
                      dataKey="balance" 
                      fill="#93c5fd" 
                      name="Balance"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="totalInterestPaid" 
                      fill="#ef4444" 
                      name="Total Interest Paid"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="totalPrincipalPaid" 
                      fill="#1e40af" 
                      name="Total Principal Paid"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="totalCost" 
                      fill="#fbbf24" 
                      name="Total Cost"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                <p>No chart data available for this mortgage.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Complete Amortization Schedule Modal */}
      {showCompleteScheduleModal && (
        <AmortizationSchedule
          mortgage={mortgageObj}
          propertyName={mortgage.property?.address || mortgage.propertyName || 'Property'}
          onClose={() => setShowCompleteScheduleModal(false)}
        />
      )}
    </div>
  );
};

export default MortgageCardView;

