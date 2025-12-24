"use client";

export default function StepIndicator({ currentStep, totalSteps }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              step === currentStep
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : step < currentStep
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}
          >
            {step < currentStep ? '✓' : step}
          </div>
          {step < totalSteps && (
            <div
              className={`w-12 h-0.5 mx-1 transition-colors ${
                step < currentStep
                  ? 'bg-emerald-500'
                  : 'bg-gray-200 dark:bg-gray-800'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

