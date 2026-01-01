"use client";

const STEP_LABELS = {
  1: 'Account',
  2: 'Properties',
  3: '', // Step 3 was removed
  4: 'Review',
  5: 'Financial Data'
};

export default function StepIndicator({ currentStep, totalSteps }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-2 mb-3">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  step === currentStep
                    ? 'bg-black dark:bg-white text-white dark:text-black ring-2 ring-black dark:ring-white ring-offset-2'
                    : step < currentStep
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {step < currentStep ? '✓' : step}
              </div>
              {STEP_LABELS[step] && (
                <span className={`text-xs mt-1.5 font-medium ${
                  step === currentStep
                    ? 'text-black dark:text-white'
                    : step < currentStep
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {STEP_LABELS[step]}
                </span>
              )}
            </div>
            {step < totalSteps && (
              <div
                className={`w-16 h-0.5 mx-2 transition-colors ${
                  step < currentStep
                    ? 'bg-emerald-500'
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






