"use client";

import React, { useMemo } from 'react';
import { formatCurrency } from '@/utils/formatting';
import { calculateAmortizationSchedule } from '@/utils/mortgageCalculator';

const PaymentBreakdown = ({ mortgageData }) => {
  const mortgage = mortgageData?.mortgage;

  const { periodicPayment, monthlyEquivalent, propertyTax } = useMemo(() => {
    if (!mortgage) {
      return {
        periodicPayment: 1102.28,
        monthlyEquivalent: 1102.28,
        propertyTax: null,
      };
    }

    try {
      const schedule = calculateAmortizationSchedule(mortgage);
      const today = new Date();
      const nextPayment =
        schedule.payments.find(p => new Date(p.paymentDate) >= today) ||
        schedule.payments[schedule.payments.length - 1];

      const periodic = nextPayment ? nextPayment.monthlyPayment : 0;
      const freq = (mortgage.paymentFrequency || 'monthly').toLowerCase();

      let monthlyEq = periodic;
      if (freq === 'bi-weekly' || freq === 'accelerated bi-weekly') {
        monthlyEq = periodic * 26 / 12;
      } else if (freq === 'weekly' || freq === 'accelerated weekly') {
        monthlyEq = periodic * 52 / 12;
      }

      return {
        periodicPayment: periodic,
        monthlyEquivalent: monthlyEq,
        propertyTax: mortgage.propertyTax ?? null,
      };
    } catch {
      return {
        periodicPayment: mortgage.paymentAmount || 1102.28,
        monthlyEquivalent: (mortgage.paymentAmount || 1102.28) * 26 / 12,
        propertyTax: mortgage.propertyTax ?? null,
      };
    }
  }, [mortgage]);
  
  const paymentComponents = [
    { label: "Principal and Interest", amount: periodicPayment },
    { label: "Property Tax", amount: propertyTax } // null means not included or zero
  ];

  const paymentFrequency = mortgage?.paymentFrequency || "Bi-Weekly";
  const remainingAmortization = mortgage?.remainingAmortization || "16 Years 4 Months";
  const secureStart = mortgage?.secureStart || "0";

  const additionalDetails = [
    { label: "Payment Frequency", value: paymentFrequency },
    { label: "Remaining Amortization", value: remainingAmortization, hasInfoIcon: true },
    { label: "Secure Start", value: secureStart }
  ];

  const InfoIcon = () => (
    <svg className="w-4 h-4 text-[#205A3E] dark:text-[#4ade80]" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  );

  const handleRequestStatement = () => {
    // Handle request information statement
    console.log('Requesting information statement...');
    // You can implement the actual functionality here
  };

  const DetailRow = ({ label, value, hasInfoIcon = false, infoTooltip = "" }) => (
    <div className="flex justify-between items-center py-2">
      <div className="flex items-center gap-2">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        {hasInfoIcon && (
          <div className="group relative">
            <InfoIcon />
            {infoTooltip && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[#205A3E] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                {infoTooltip}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-[#205A3E]"></div>
              </div>
            )}
          </div>
        )}
      </div>
      <span className="font-medium text-right">{value}</span>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-black/10 dark:border-white/10 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Mortgage Details</h3>
        <button
          onClick={handleRequestStatement}
          className="px-4 py-2 border-2 border-[#205A3E] text-[#205A3E] dark:text-[#4ade80] dark:border-[#4ade80] rounded-lg hover:bg-[#205A3E]/10 dark:hover:bg-[#4ade80]/10 transition-colors duration-200 text-sm font-medium"
        >
          Request Information Statement
        </button>
      </div>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Your mortgage payment is made up of the element(s) listed below.
      </p>

      {/* Payment Components */}
      <div className="space-y-3 mb-6">
        <h4 className="font-medium text-gray-900 dark:text-white">Payment Components</h4>
        {paymentComponents.map((component, index) => (
          <div key={index} className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400">{component.label}</span>
            <span className="font-medium">
              {component.amount ? formatCurrency(component.amount) : "-"}
            </span>
          </div>
        ))}
      </div>

      {/* Additional Details */}
      <div className="space-y-1">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Additional Details</h4>
        {additionalDetails.map((detail, index) => (
          <DetailRow
            key={index}
            label={detail.label}
            value={detail.value}
            hasInfoIcon={detail.hasInfoIcon}
            infoTooltip={detail.label === "Remaining Amortization" ? "The time remaining to fully pay off your mortgage" : ""}
          />
        ))}
      </div>
    </div>
  );
};

export default PaymentBreakdown;
