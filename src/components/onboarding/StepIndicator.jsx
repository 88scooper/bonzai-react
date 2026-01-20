"use client";

const STEP_LABELS = {
  1: 'Privacy',
  2: 'Account',
  3: 'Properties',
  4: 'Review',
  5: 'Financial Data'
};

export default function StepIndicator({ currentStep, totalSteps }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-1.5 mb-3">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  step === currentStep
                    ? 'bg-[#205A3E] text-white border-2 border-[#205A3E]'
                    : step < currentStep
                    ? 'bg-[#205A3E] text-white border-2 border-[#205A3E]'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-700'
                }`}
              >
                {step < currentStep ? '✓' : step}
              </div>
              {STEP_LABELS[step] && (
                <span className={`text-[10px] mt-1 font-medium ${
                  step === currentStep
                    ? 'text-[#205A3E] dark:text-[#66B894]'
                    : step < currentStep
                    ? 'text-[#205A3E] dark:text-[#66B894]'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {STEP_LABELS[step]}
                </span>
              )}
            </div>
            {step < totalSteps && (
              <div
                className={`w-12 h-[2px] mx-1.5 transition-colors ${
                  step < currentStep
                    ? 'bg-[#205A3E]'
                    : 'bg-gray-200 dark:bg-gray-800'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      {/* Current step status */}
      <div className="text-center">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Step {currentStep} of {totalSteps}: {STEP_LABELS[currentStep] || 'In Progress'}
        </p>
      </div>
    </div>
  );
}






