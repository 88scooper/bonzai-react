"use client";

import { useState } from 'react';
import { Settings, TrendingUp, TrendingDown, AlertCircle, Percent, HelpCircle } from 'lucide-react';
import Input from '@/components/Input';

export default function SettingsSidebar({ assumptions, onAssumptionsChange }) {
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

  const primaryLevers = [
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
  ];

  const secondaryAssumptions = [
    {
      id: 'vacancyRate',
      label: 'Vacancy Rate',
      tooltip: 'Expected percentage of time property is vacant. Lower vacancy = more consistent cash flow.',
      suffix: '%',
      step: '0.1',
      icon: AlertCircle,
    },
  ];

  return (
    <div className="fixed right-0 top-0 h-screen w-[300px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-y-auto z-10">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 pb-4 border-b border-gray-200 dark:border-gray-800">
          <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
        </div>

        {/* Primary Levers Card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            Primary Levers
          </h3>
          
          <div className="space-y-4">
            {primaryLevers.map((field, index) => {
              const Icon = field.icon;
              const isLast = index === primaryLevers.length - 1;
              
              return (
                <div key={field.id}>
                  <div className="relative">
                    <Input
                      id={field.id}
                      label={field.label}
                      type="number"
                      value={getAssumptionValue(field.id)}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      step={field.step}
                      min="0"
                      max="100"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-[28px] text-sm font-medium text-gray-500 dark:text-gray-400 tabular-nums">
                      {field.suffix}
                    </span>
                    <div className="absolute right-0 top-0 mt-[28px] mr-8">
                      <HelpCircle
                        className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-gray-600 dark:hover:text-gray-300"
                        onMouseEnter={() => setShowTooltip(field.id)}
                        onMouseLeave={() => setShowTooltip(null)}
                      />
                      {showTooltip === field.id && (
                        <div className="absolute right-0 top-5 z-50 w-64 p-2.5 bg-gray-900 text-white text-xs rounded-md shadow-xl">
                          {field.tooltip}
                          <div className="absolute right-4 top-0 -mt-1.5 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-gray-900"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  {!isLast && (
                    <div className="mt-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4 ml-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Secondary Assumptions */}
        {secondaryAssumptions.map((field) => {
          const Icon = field.icon;
          return (
            <div key={field.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <div className="relative">
                <Input
                  id={field.id}
                  label={field.label}
                  type="number"
                  value={assumptions[field.id] || 0}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  step={field.step}
                  min="0"
                  max="100"
                  className="pr-8"
                />
                <span className="absolute right-3 top-[28px] text-sm font-medium text-gray-500 dark:text-gray-400 tabular-nums">
                  {field.suffix}
                </span>
                <div className="absolute right-0 top-0 mt-[28px] mr-8">
                  <HelpCircle
                    className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-gray-600 dark:hover:text-gray-300"
                    onMouseEnter={() => setShowTooltip(field.id)}
                    onMouseLeave={() => setShowTooltip(null)}
                  />
                  {showTooltip === field.id && (
                    <div className="absolute right-0 top-5 z-50 w-64 p-2.5 bg-gray-900 text-white text-xs rounded-md shadow-xl">
                      {field.tooltip}
                      <div className="absolute right-4 top-0 -mt-1.5 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-gray-900"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
