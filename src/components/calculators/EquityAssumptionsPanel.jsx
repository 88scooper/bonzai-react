"use client";

import { useState } from 'react';
import { HelpCircle, Save, TrendingUp, TrendingDown, Home, Sparkles, AlertCircle, Building2 } from 'lucide-react';

const SCENARIO_MODES = {
  CUSTOM: 'custom',
  APPRECIATION_CHANGE: 'appreciation-change',
  INTEREST_CHANGE: 'interest-change',
  EXIT_CAP_CHANGE: 'exit-cap-change',
};

const scenarioConfigs = {
  [SCENARIO_MODES.CUSTOM]: {
    label: 'Custom Analysis',
    description: 'Adjust all assumptions freely',
    icon: null,
    editableFields: ['annualPropertyAppreciation', 'exitCapRate', 'futureInterestRate'],
  },
  [SCENARIO_MODES.APPRECIATION_CHANGE]: {
    label: 'Appreciation',
    description: 'See how property appreciation affects equity growth',
    icon: TrendingUp,
    editableFields: ['annualPropertyAppreciation'],
  },
  [SCENARIO_MODES.INTEREST_CHANGE]: {
    label: 'Interest Rate',
    description: 'Model how interest rate changes impact mortgage paydown',
    icon: TrendingDown,
    editableFields: ['futureInterestRate'],
  },
  [SCENARIO_MODES.EXIT_CAP_CHANGE]: {
    label: 'Exit Cap Rate',
    description: 'Understand how exit cap rate affects final property value',
    icon: Building2,
    editableFields: ['exitCapRate'],
  },
};

// Preset templates for equity
const EQUITY_PRESET_TEMPLATES = {
  conservative: {
    name: 'Conservative',
    description: 'Lower appreciation, higher exit cap rate, higher interest rates',
    values: {
      annualPropertyAppreciation: 2.0,
      exitCapRate: 5.5,
      futureInterestRate: 5.5,
    },
  },
  moderate: {
    name: 'Moderate',
    description: 'Balanced assumptions based on market averages',
    values: {
      annualPropertyAppreciation: 3.0,
      exitCapRate: 5.0,
      futureInterestRate: 5.0,
    },
  },
  aggressive: {
    name: 'Aggressive',
    description: 'Higher appreciation, lower exit cap rate, lower interest rates',
    values: {
      annualPropertyAppreciation: 5.0,
      exitCapRate: 4.5,
      futureInterestRate: 4.5,
    },
  },
};

const EquityAssumptionsPanel = ({ assumptions, onAssumptionsChange, onSaveClick, showInputs = true }) => {
  const [showTooltip, setShowTooltip] = useState(null);
  const [scenarioMode, setScenarioMode] = useState(SCENARIO_MODES.CUSTOM);
  const [selectedTemplate, setSelectedTemplate] = useState('moderate');

  const handleInputChange = (field, value) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onAssumptionsChange({
        ...assumptions,
        [field]: numValue
      });
    }
  };

  const inputFields = [
    {
      id: 'annualPropertyAppreciation',
      label: 'Annual Property Appreciation',
      tooltip: 'Expected percentage increase in property value each year. Historical average varies by market, typically 3-5%.',
      description: 'Expected percentage increase in property value each year. Higher appreciation = more equity growth.',
      suffix: '%',
      step: '0.1',
      icon: TrendingUp,
      color: 'emerald'
    },
    {
      id: 'exitCapRate',
      label: 'Exit Cap Rate',
      tooltip: 'The capitalization rate used to determine future sale price. Future Sale Price = Final Year NOI / Exit Cap Rate. Typically 0.5-1% higher than entry cap rate.',
      description: 'Cap rate used to calculate future sale price. Lower cap rate = higher property value.',
      suffix: '%',
      step: '0.1',
      icon: Building2,
      color: 'blue'
    },
    {
      id: 'futureInterestRate',
      label: 'Future Interest Rate',
      tooltip: 'Expected mortgage interest rate for renewals. Use this to model what happens when your current term expires.',
      description: 'Expected interest rate for mortgage renewals. Lower rates = faster principal paydown.',
      suffix: '%',
      step: '0.1',
      icon: AlertCircle,
      color: 'amber'
    },
  ];

  const currentScenario = scenarioConfigs[scenarioMode];
  const isFieldEditable = (fieldId) => currentScenario.editableFields.includes(fieldId);

  const handleScenarioModeChange = (mode) => {
    setScenarioMode(mode);
  };

  const handleTemplateSelect = (templateKey) => {
    setSelectedTemplate(templateKey);
    const template = EQUITY_PRESET_TEMPLATES[templateKey];
    if (template) {
      onAssumptionsChange(template.values);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Scenario Builder
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {scenarioMode === SCENARIO_MODES.CUSTOM
              ? 'Adjust assumptions to model different equity scenarios'
              : `Focus mode: ${currentScenario.description.toLowerCase()}`}
          </p>
        </div>
        {onSaveClick && (
          <button
            onClick={onSaveClick}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5
                     bg-black text-white dark:bg-white dark:text-gray-900 rounded-md
                     hover:opacity-90 transition-opacity text-xs font-medium flex-shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            Save Scenario
          </button>
        )}
      </div>

      {/* Preset Templates and Analysis Mode */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Preset Templates */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preset Templates
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(EQUITY_PRESET_TEMPLATES).map(([key, template]) => {
                const isActive = selectedTemplate === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleTemplateSelect(key)}
                    className={`group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-2 border-emerald-300 dark:border-emerald-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 border-2 border-transparent'
                    }`}
                    title={template.description}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{template.name}</span>
                    {isActive && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {EQUITY_PRESET_TEMPLATES[selectedTemplate]?.description}
            </p>
          </div>

          {/* Scenario Mode Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Analysis Mode
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(scenarioConfigs).map(([mode, config]) => {
                const Icon = config.icon;
                const isActive = scenarioMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => handleScenarioModeChange(mode)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    <span>{config.label.replace(' Scenario', '').replace(' Analysis', '')}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Equity Drivers - conditionally show */}
      {showInputs && (
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Equity Drivers</h3>
        <div className="flex items-end gap-3 flex-wrap">
          {inputFields.map((field) => {
            const isEditable = isFieldEditable(field.id);
            const Icon = field.icon;
            const colorClasses = {
              emerald: {
                icon: 'text-emerald-600 dark:text-emerald-400',
                border: 'border-emerald-200 dark:border-emerald-800',
                bg: 'bg-emerald-50 dark:bg-emerald-900/20'
              },
              blue: {
                icon: 'text-blue-600 dark:text-blue-400',
                border: 'border-blue-200 dark:border-blue-800',
                bg: 'bg-blue-50 dark:bg-blue-900/20'
              },
              amber: {
                icon: 'text-amber-600 dark:text-amber-400',
                border: 'border-amber-200 dark:border-amber-800',
                bg: 'bg-amber-50 dark:bg-amber-900/20'
              }
            };
            const colors = colorClasses[field.color] || {};
            
            return (
              <div key={field.id} className={`flex-1 min-w-[160px] ${!isEditable ? 'opacity-50' : ''}`}>
                <div className={`p-3 rounded-lg border ${colors.border || 'border-black/10 dark:border-white/10'} ${colors.bg || ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                      {Icon && <Icon className={`w-4 h-4 ${colors.icon || ''}`} />}
                      {field.label}
                      <div className="relative inline-block">
                        <HelpCircle
                          className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-gray-600 dark:hover:text-gray-300"
                          onMouseEnter={() => setShowTooltip(field.id)}
                          onMouseLeave={() => setShowTooltip(null)}
                        />
                        {showTooltip === field.id && (
                          <div className="absolute left-5 top-0 z-50 w-64 p-2.5 bg-gray-900 text-white text-xs rounded-md shadow-xl">
                            {field.tooltip}
                            {!isEditable && (
                              <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                                Locked in focus mode
                              </div>
                            )}
                            <div className="absolute left-0 top-2 -ml-1.5 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-gray-900"></div>
                          </div>
                        )}
                      </div>
                    </label>
                    {!isEditable && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">
                        LOCKED
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">{field.description}</p>
                  <div className="relative">
                    <input
                      type="number"
                      value={assumptions[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      step={field.step}
                      min="0"
                      max="100"
                      disabled={!isEditable}
                      className={`w-full px-2.5 py-2 pr-8 rounded-md border bg-transparent text-sm transition-colors ${
                        isEditable
                          ? 'border-black/15 dark:border-white/15 text-gray-900 dark:text-white focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20'
                          : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      }`}
                    />
                    <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium ${
                      isEditable ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {field.suffix}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
};

export default EquityAssumptionsPanel;

