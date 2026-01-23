"use client";

import { useState } from 'react';
import { Settings, TrendingUp, TrendingDown, AlertCircle, Percent, HelpCircle } from 'lucide-react';

export default function InlineSettingsPanel({ assumptions, onAssumptionsChange, analysisMode = 'cash-flow' }) {
  const [showTooltip, setShowTooltip] = useState(null);

  const handleInputChange = (field, value) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onAssumptionsChange({
        ...assumptions,
        [field]: numValue
      });
    }
  };

  // Handle cases where futureInterestRate might not exist in cash flow assumptions
  const getAssumptionValue = (fieldId) => {
    return assumptions[fieldId] || 0;
  };

  // Cash flow assumptions
  const cashFlowFields = [
    {
      id: 'annualRentIncrease',
      label: 'Rent Increase',
      tooltip: 'How much your rental income grows each year. Higher growth = more cash flow.',
      suffix: '%',
      step: '0.1',
      icon: TrendingUp,
    },
    {
      id: 'annualExpenseInflation',
      label: 'Cost Increase',
      tooltip: 'How much your operating costs increase each year. Lower inflation = better cash flow.',
      suffix: '%',
      step: '0.1',
      icon: TrendingDown,
    },
    {
      id: 'futureInterestRate',
      label: 'Mortgage Refinancing',
      tooltip: 'Expected mortgage interest rate for renewals. Use this to model what happens when your current term expires.',
      suffix: '%',
      step: '0.1',
      icon: Percent,
    },
    {
      id: 'vacancyRate',
      label: 'Vacancy Rate',
      tooltip: 'Expected percentage of time property is vacant. Lower vacancy = more consistent cash flow.',
      suffix: '%',
      step: '0.1',
      icon: AlertCircle,
    },
  ];

  // Equity assumptions
  const equityFields = [
    {
      id: 'annualPropertyAppreciation',
      label: 'Property Appreciation',
      tooltip: 'Expected percentage increase in property value each year. Higher appreciation = more equity growth.',
      suffix: '%',
      step: '0.1',
      icon: TrendingUp,
    },
    {
      id: 'exitCapRate',
      label: 'Exit Cap Rate',
      tooltip: 'The capitalization rate used to determine future sale price. Lower cap rate = higher property value.',
      suffix: '%',
      step: '0.1',
      icon: Percent,
    },
    {
      id: 'futureInterestRate',
      label: 'Future Interest Rate',
      tooltip: 'Expected mortgage interest rate for renewals. Lower rates = faster principal paydown.',
      suffix: '%',
      step: '0.1',
      icon: AlertCircle,
    },
  ];

  const fields = analysisMode === 'cash-flow' ? cashFlowFields : equityFields;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Adjust Assumptions</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {fields.map((field) => {
          const Icon = field.icon;
          const value = getAssumptionValue(field.id);
          
          return (
            <div key={field.id} className="relative">
              <label 
                htmlFor={field.id}
                className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                <div className="flex items-center gap-1.5">
                  {Icon && <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />}
                  {field.label}
                  <div className="relative inline-block">
                    <HelpCircle
                      className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-gray-600 dark:hover:text-gray-300"
                      onMouseEnter={() => setShowTooltip(field.id)}
                      onMouseLeave={() => setShowTooltip(null)}
                    />
                    {showTooltip === field.id && (
                      <div className="absolute left-0 top-5 z-50 w-64 p-2.5 bg-gray-900 text-white text-xs rounded-md shadow-xl">
                        {field.tooltip}
                        <div className="absolute left-4 top-0 -mt-1.5 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-gray-900"></div>
                      </div>
                    )}
                  </div>
                </div>
              </label>
              <div className="relative">
                <input
                  id={field.id}
                  type="number"
                  value={value}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  step={field.step}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 pr-8 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 dark:text-gray-400 tabular-nums">
                  {field.suffix}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
