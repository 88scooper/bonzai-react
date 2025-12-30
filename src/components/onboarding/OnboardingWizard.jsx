"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { useToast } from "@/context/ToastContext";
import apiClient from "@/lib/api-client";
import StepIndicator from "./StepIndicator";
import FileUploadZone from "./FileUploadZone";
import PropertyForm from "./PropertyForm";
import FinancialDataStep from "./FinancialDataStep";
import Button from "@/components/Button";
import { CheckCircle2, Loader2, Download, X } from "lucide-react";
import { downloadPropertyTemplate } from "@/lib/excel-template";

export default function OnboardingWizard({ onComplete }) {
  const router = useRouter();
  const { user } = useAuth();
  const { createNewAccount, currentAccountId, accounts } = useAccount();
  const { addToast } = useToast();

  const totalSteps = 5;

  // Mark onboarding as in progress when wizard mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('onboarding_in_progress', 'true');
      // Check if we should restore a previous step (to prevent reset on remount)
      const savedStep = sessionStorage.getItem('onboarding_current_step');
      if (savedStep) {
        const step = parseInt(savedStep, 10);
        if (step > 1 && step <= totalSteps) {
          setCurrentStep(step);
        }
      }
      // Check if we should show step 5 (when coming from portfolio page)
      const shouldShowStep5 = sessionStorage.getItem('onboarding_step_5') === 'true';
      if (shouldShowStep5) {
        setCurrentStep(5);
        sessionStorage.removeItem('onboarding_step_5');
      }
    }
  }, [totalSteps]);

  const [currentStep, setCurrentStep] = useState(() => {
    // Initialize from sessionStorage if available (to persist across remounts)
    if (typeof window !== 'undefined') {
      const savedStep = sessionStorage.getItem('onboarding_current_step');
      if (savedStep) {
        const step = parseInt(savedStep, 10);
        if (step > 1 && step <= 5) {
          return step;
        }
      }
    }
    return 1;
  });
  
  // Save current step to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && currentStep > 1) {
      sessionStorage.setItem('onboarding_current_step', currentStep.toString());
    }
  }, [currentStep]);

  const [loading, setLoading] = useState(false);
  const [accountId, setAccountId] = useState(null);

  // Load account ID when resuming onboarding (if we're past step 1 and have a current account)
  useEffect(() => {
    if (currentStep > 1 && currentAccountId && !accountId) {
      setAccountId(currentAccountId);
    }
  }, [currentStep, currentAccountId, accountId]);
  const [accountName, setAccountName] = useState(user?.email?.split('@')[0] || 'My Account');
  const [accountEmail, setAccountEmail] = useState(user?.email || '');
  const [uploadMethod, setUploadMethod] = useState(null); // 'file' | 'manual' | null
  const [selectedFile, setSelectedFile] = useState(null);
  const [properties, setProperties] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({ processed: 0, total: 0 });
  const [propertyFormKey, setPropertyFormKey] = useState(0); // Key to force form reset
  const [selectedPropertyId, setSelectedPropertyId] = useState(null); // Property to add data to
  const [mortgageAdded, setMortgageAdded] = useState(false);
  const [tenantAdded, setTenantAdded] = useState(false);
  const [expenseAdded, setExpenseAdded] = useState(false);

  // Step 1: Create Account
  const handleCreateAccount = async () => {
    if (!accountName.trim()) {
      addToast("Account name is required", { type: "error" });
      return;
    }

    if (!accountEmail.trim()) {
      addToast("Email is required", { type: "error" });
      return;
    }

    setLoading(true);
    try {
      const account = await createNewAccount(accountName, accountEmail);
      if (account && account.id) {
        setAccountId(account.id);
        // Save step to sessionStorage immediately to prevent reset on remount
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('onboarding_current_step', '2');
        }
        // Use setTimeout to ensure state updates complete before changing step
        // This prevents race conditions with the onboarding page re-rendering
        setTimeout(() => {
          setCurrentStep(2);
          console.log('Advanced to step 2');
        }, 0);
        addToast("Account created successfully!", { type: "success" });
      } else {
        throw new Error("Account creation succeeded but no account ID was returned");
      }
    } catch (error) {
      console.error("Error creating account:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create account";
      addToast(errorMessage, { type: "error" });
      // Don't advance to step 2 if there's an error
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Select upload method
  const handleMethodSelect = (method) => {
    setUploadMethod(method);
    setCurrentStep(3);
  };

  // Step 3a: Handle file upload
  const handleFileUpload = async () => {
    if (!selectedFile || !accountId) {
      addToast("Please select a file", { type: "error" });
      return;
    }

    setLoading(true);
    setUploadProgress({ processed: 0, total: 1 });

    try {
      const response = await apiClient.bulkUploadProperties(accountId, selectedFile);
      
      if (response.success && response.data) {
        const { created, failed, total, errors } = response.data;
        
        if (created > 0) {
          addToast(`Successfully uploaded ${created} property${created > 1 ? 'ies' : ''}!`, { type: "success" });
          if (errors && errors.length > 0) {
            console.warn("Upload errors:", errors);
          }
          // After bulk upload, refresh accounts to get property IDs
          // The FinancialDataStep will fetch the first property
          setCurrentStep(4);
        } else {
          addToast("No properties were uploaded. Please check your file format.", { type: "error" });
        }
      } else {
        throw new Error(response.error || "Upload failed");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      addToast(error.message || "Failed to upload file", { type: "error" });
    } finally {
      setLoading(false);
      setUploadProgress({ processed: 0, total: 0 });
    }
  };

  // Step 3b: Handle manual property submission
  const handleAddProperty = async (propertyData) => {
    if (!accountId) {
      addToast("Account ID is missing", { type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.createProperty(propertyData);
      
      if (response.success) {
        const newProperty = response.data;
        setProperties(prev => [...prev, newProperty]);
        // Set the first property as selected for step 5
        if (!selectedPropertyId) {
          setSelectedPropertyId(newProperty.id);
        }
        addToast("Property added successfully!", { type: "success" });
        // Reset form for next entry
        setPropertyFormKey(prev => prev + 1);
      } else {
        throw new Error(response.error || "Failed to add property");
      }
    } catch (error) {
      console.error("Error adding property:", error);
      addToast(error.message || "Failed to add property", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Navigate to portfolio and show step 5 as modal
  const handleContinueToStep5 = () => {
    // Set flag to show step 5 when on portfolio page
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('onboarding_step_5', 'true');
    }
    // Navigate to portfolio summary
    router.push("/portfolio-summary");
  };

  // Step 4: Complete onboarding (skip financial data)
  const handleComplete = () => {
    // Clear saved step when completing
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('onboarding_current_step');
      sessionStorage.removeItem('onboarding_in_progress');
    }
    if (onComplete) {
      onComplete();
    }
    router.push("/portfolio-summary");
  };

  const handleSkip = () => {
    if (onComplete) {
      onComplete();
    }
    router.push("/portfolio-summary");
  };

  // If step 5, show as modal overlay
  const isModalMode = currentStep === 5;
  
  const wizardContent = (
    <>
      {!isModalMode && (
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Welcome to Proplytics!</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Let's get you set up in just a few steps
          </p>
        </div>
      )}

      {!isModalMode && <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />}

      <div className={`bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl p-8 ${isModalMode ? 'max-h-[90vh] overflow-y-auto' : ''}`}>
          {/* Step 1: Create Account */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Create Your Account</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create an account to organize your properties
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="accountName" className="block text-sm font-medium mb-1">
                    Account Name *
                  </label>
                  <input
                    id="accountName"
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    placeholder="My Account"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="accountEmail" className="block text-sm font-medium mb-1">
                    Email *
                  </label>
                  <input
                    id="accountEmail"
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    placeholder="account@example.com"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleCreateAccount} loading={loading}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Select Upload Method */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Add Your Properties</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose how you'd like to add your properties
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleMethodSelect('file')}
                  className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition text-left"
                >
                  <div className="text-2xl mb-2">📁</div>
                  <h3 className="font-semibold mb-1">Upload File</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Upload Excel or CSV file with your property data
                  </p>
                </button>

                <button
                  onClick={() => handleMethodSelect('manual')}
                  className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition text-left"
                >
                  <div className="text-2xl mb-2">✏️</div>
                  <h3 className="font-semibold mb-1">Manual Entry</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Add properties one at a time using a form
                  </p>
                </button>
              </div>

              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button variant="secondary" onClick={handleSkip}>
                  Skip for now
                </Button>
              </div>
            </div>
          )}

          {/* Step 3a: File Upload */}
          {currentStep === 3 && uploadMethod === 'file' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Upload Property File</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload an Excel (.xlsx, .xls) or CSV file containing your property data
                </p>
              </div>

              {/* Download Template Button */}
              <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Need a template?
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Download our Excel template with example data to get started
                  </p>
                </div>
                <button
                  onClick={downloadPropertyTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>

              <FileUploadZone onFileSelect={setSelectedFile} />

              {selectedFile && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <p className="text-sm text-emerald-800 dark:text-emerald-200">
                    File ready: {selectedFile.name}
                  </p>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={handleFileUpload}
                  loading={loading}
                  disabled={!selectedFile || loading}
                >
                  Upload Properties
                </Button>
              </div>
            </div>
          )}

          {/* Step 3b: Manual Entry */}
          {currentStep === 3 && uploadMethod === 'manual' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Add Property</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter your property details below
                </p>
              </div>

              <PropertyForm
                key={propertyFormKey}
                accountId={accountId}
                onSubmit={handleAddProperty}
                onCancel={properties.length > 0 ? undefined : () => setCurrentStep(2)}
              />

              {properties.length > 0 && (
                <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <p className="text-sm text-emerald-800 dark:text-emerald-200 mb-2">
                    Added {properties.length} property{properties.length > 1 ? 'ies' : ''}:
                  </p>
                  <ul className="list-disc list-inside text-sm text-emerald-700 dark:text-emerald-300">
                    {properties.map((prop, idx) => (
                      <li key={prop.id || idx}>
                        {prop.nickname || prop.address || `Property ${idx + 1}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
                <div className="flex gap-3">
                  {properties.length > 0 && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setPropertyFormKey(prev => prev + 1); // Reset form by changing key
                      }}
                    >
                      Add Another
                    </Button>
                  )}
                  <Button onClick={() => {
                    // If we have properties, set the first one as selected
                    if (properties.length > 0 && !selectedPropertyId) {
                      setSelectedPropertyId(properties[0].id);
                    }
                    setCurrentStep(4);
                  }} disabled={loading}>
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Properties Added */}
          {currentStep === 4 && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="w-16 h-16 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Properties Added!</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Great! Your properties have been added. 
                  Would you like to add mortgage, income, and expense information now?
                </p>
              </div>

              <div className="flex justify-center gap-3">
                <Button variant="secondary" onClick={handleComplete}>
                  Skip for now
                </Button>
                <Button onClick={handleContinueToStep5}>
                  Add Financial Data
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Add Financial Data */}
          {currentStep === 5 && (
            <FinancialDataStep
              propertyId={selectedPropertyId}
              properties={properties}
              accountId={accountId}
              mortgageAdded={mortgageAdded}
              tenantAdded={tenantAdded}
              expenseAdded={expenseAdded}
              onMortgageAdded={() => setMortgageAdded(true)}
              onTenantAdded={() => setTenantAdded(true)}
              onExpenseAdded={() => setExpenseAdded(true)}
              onComplete={handleComplete}
              onBack={() => setCurrentStep(4)}
            />
          )}
        </div>
    </>
  );

  // Render as modal for step 5
  if (isModalMode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div 
          className="bg-white dark:bg-neutral-950 rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col border border-black/10 dark:border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-black/10 dark:border-white/10">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Add Financial Data
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Complete your property setup
              </p>
            </div>
            <button
              onClick={handleComplete}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {wizardContent}
          </div>
        </div>
      </div>
    );
  }

  // Render as full page for steps 1-4
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {wizardContent}
      </div>
    </div>
  );
}

