"use client";

import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/utils/formatting';
import { calculateAmortizationSchedule } from '@/utils/mortgageCalculator';

const MortgageCardView = ({ mortgage }) => {
  const [showAmortizationSchedule, setShowAmortizationSchedule] = useState(false);
  const [showMortgageDetails, setShowMortgageDetails] = useState(false);
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
      let nextPaymentIndex = schedule.payments.findIndex(payment => {
        const paymentDate = new Date(payment.paymentDate);
        return paymentDate >= now;
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
      const nextPaymentDate = currentPayment
        ? new Date(currentPayment.paymentDate)
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

  const InfoIcon = () => (
    <svg className="w-4 h-4 text-[#205A3E] dark:text-[#4ade80]" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  );

  return (
    <div className="space-y-6">
      {/* Property Address */}
      <div className="text-left">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {mortgage.property?.address || mortgage.propertyName || 'Property Address'}
        </h2>
      </div>

      {/* Top Summary Banner - Green Background */}
      <div className="bg-gradient-to-r from-[#205A3E] to-[#2d7a5a] text-white p-4 sm:p-6 rounded-xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 items-center">
          
          {/* Left Section - Balance Overview with Donut Chart */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-36 h-36 sm:w-52 sm:h-52 relative flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={balanceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    dataKey="value"
                    startAngle={90}
                    endAngle={450}
                    stroke="none"
                    strokeWidth={0}
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
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center px-2">
                  <div className="text-xs font-medium text-white/90">Starting Balance</div>
                  <div className="text-sm font-bold text-white">{formatCurrency(startingBalance)}</div>
                </div>
              </div>
            </div>
              <div className="space-y-3 sm:space-y-4 flex-1">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gray-500 shadow-sm flex-shrink-0"></div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-white/80 uppercase tracking-wide">Current Balance</div>
                  <div className="font-bold text-white text-xs sm:text-sm mt-1">{formatCurrency(currentBalance)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white shadow-sm flex-shrink-0"></div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-white/80 uppercase tracking-wide">Balance Paid</div>
                  <div className="font-bold text-white text-xs sm:text-sm mt-1">{formatCurrency(balancePaid)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Section - Next Payment with Amount */}
          <div className="space-y-4 text-center">
            <div>
              <div className="text-xs font-medium text-white/80 uppercase tracking-wide mb-2">Next Payment</div>
              <div className="text-xl font-bold text-white mb-1">
                {mortgageData.nextPaymentDate.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
              <div className="text-sm font-medium text-white/90 mb-2">{mortgageData.daysUntilPayment} days remaining</div>
              <div className="text-lg font-bold text-white">
                {formatCurrency(mortgageData.monthlyPayment)}
              </div>
            </div>
          </div>

          {/* Right Section - Payment Breakdown */}
          <div className="space-y-4">
          <div className="text-left">
            <div className="text-xs font-medium text-white/80 uppercase tracking-wide mb-2">
              Total Monthly Payment
            </div>
            <div className="text-xl font-bold text-white">
              {mortgageObj.paymentFrequency?.toLowerCase() === 'bi-weekly'
                ? formatCurrency(monthlyPayment * 26 / 12)
                : formatCurrency(monthlyPayment)}
            </div>
            {mortgageObj.paymentFrequency?.toLowerCase() === 'bi-weekly' && (
              <div className="text-xs font-medium text-white/70 mt-1">
                Bi-weekly
              </div>
            )}
          </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[#205A3E] flex-shrink-0"></div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-white/80 uppercase tracking-wide">
                    {mortgageObj.paymentFrequency?.toLowerCase() === 'bi-weekly'
                      ? 'Principal (bi-weekly)'
                      : 'Principal'}
                  </div>
                  <div className="font-bold text-white text-sm">{formatCurrency(principalAmount)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-white/20 flex-shrink-0"></div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-white/80 uppercase tracking-wide">
                    {mortgageObj.paymentFrequency?.toLowerCase() === 'bi-weekly'
                      ? 'Interest (bi-weekly)'
                      : 'Interest'}
                  </div>
                  <div className="font-bold text-white text-sm">{formatCurrency(interestAmount)}</div>
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
                      onClick={() => setShowAmortizationSchedule(false)}
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
    </div>
  );
};

export default MortgageCardView;

