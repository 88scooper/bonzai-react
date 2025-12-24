"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { useToast } from "@/context/ToastContext";
import apiClient from "@/lib/api-client";
import StepIndicator from "./StepIndicator";
import FileUploadZone from "./FileUploadZone";
import PropertyForm from "./PropertyForm";
import Button from "@/components/Button";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function OnboardingWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const { createNewAccount, refreshAccounts } = useAccount();
  const { addToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [accountId, setAccountId] = useState(null);
  const [accountName, setAccountName] = useState(user?.email?.split('@')[0] || 'My Account');
  const [accountEmail, setAccountEmail] = useState(user?.email || '');
  const [uploadMethod, setUploadMethod] = useState(null); // 'file' | 'manual' | null
  const [selectedFile, setSelectedFile] = useState(null);
  const [properties, setProperties] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({ processed: 0, total: 0 });
  const [propertyFormKey, setPropertyFormKey] = useState(0); // Key to force form reset

  const totalSteps = 4;

  // Step 1: Create Account
  const handleCreateAccount = async () => {
    if (!accountName.trim()) {
      addToast("Account name is required", { type: "error" });
      return;
    }

    setLoading(true);
    try {
      const account = await createNewAccount(accountName, accountEmail || null);
      setAccountId(account.id);
      await refreshAccounts();
      setCurrentStep(2);
      addToast("Account created successfully!", { type: "success" });
    } catch (error) {
      console.error("Error creating account:", error);
      addToast(error.message || "Failed to create account", { type: "error" });
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
        setProperties(prev => [...prev, response.data]);
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

  // Step 4: Complete onboarding
  const handleComplete = () => {
    router.push("/portfolio-summary");
  };

  const handleSkip = () => {
    router.push("/portfolio-summary");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Welcome to Proplytics!</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Let's get you set up in just a few steps
          </p>
        </div>

        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />

        <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl p-8">
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
                    Email (optional)
                  </label>
                  <input
                    id="accountEmail"
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    placeholder="account@example.com"
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
                  <Button onClick={() => setCurrentStep(4)} disabled={loading}>
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Completion */}
          {currentStep === 4 && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="w-16 h-16 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">You're All Set!</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your account has been created and your properties have been added.
                  You can always add more properties later.
                </p>
              </div>

              <div className="flex justify-center">
                <Button onClick={handleComplete}>
                  Go to Portfolio
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

