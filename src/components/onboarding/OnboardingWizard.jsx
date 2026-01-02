"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { useToast } from "@/context/ToastContext";
import apiClient from "@/lib/api-client";
import StepIndicator from "./StepIndicator";
import PropertyForm from "./PropertyForm";
import FinancialDataStep from "./FinancialDataStep";
import Button from "@/components/Button";
import { CheckCircle2, Loader2, X, Edit, Trash2 } from "lucide-react";
import { clearAllOnboardingDrafts } from "@/lib/onboarding-draft-storage";

export default function OnboardingWizard({ onComplete, modal = false }) {
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
  const [properties, setProperties] = useState([]);
  const [propertyFormKey, setPropertyFormKey] = useState(0); // Key to force form reset
  const [selectedPropertyId, setSelectedPropertyId] = useState(null); // Property to add data to
  const [editingPropertyId, setEditingPropertyId] = useState(null); // Property being edited
  const [deletingPropertyId, setDeletingPropertyId] = useState(null); // Property to be deleted (for confirmation)
  const [pendingPropertyData, setPendingPropertyData] = useState(null); // Property data pending confirmation
  const [showAddPropertyForm, setShowAddPropertyForm] = useState(false); // Show form to add another property
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

  // Step 2: Directly shows property form (no method selection needed)


  // Handle property form submission - show confirmation first
  const handlePropertyFormSubmit = (propertyData) => {
    if (editingPropertyId) {
      // For editing, save directly without confirmation
      handleAddProperty(propertyData);
    } else {
      // For new properties, show confirmation
      setPendingPropertyData(propertyData);
    }
  };

  // Step 3b: Handle manual property submission (create or update)
  const handleAddProperty = async (propertyData) => {
    if (!accountId) {
      addToast("Account ID is missing", { type: "error" });
      return;
    }

    setLoading(true);
    try {
      if (editingPropertyId) {
        // Update existing property
        const response = await apiClient.updateProperty(editingPropertyId, propertyData);
        
        if (response.success) {
          const updatedProperty = response.data;
          setProperties(prev => prev.map(p => p.id === editingPropertyId ? updatedProperty : p));
          setEditingPropertyId(null);
          addToast("Property updated successfully!", { type: "success" });
          // Reset form
          setPropertyFormKey(prev => prev + 1);
        } else {
          throw new Error(response.error || "Failed to update property");
        }
      } else {
        // Create new property
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
          setPendingPropertyData(null); // Clear pending data
          setShowAddPropertyForm(false); // Hide form after adding
        } else {
          throw new Error(response.error || "Failed to add property");
        }
      }
    } catch (error) {
      console.error("Error saving property:", error);
      addToast(error.message || "Failed to save property", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Cancel property confirmation
  const handleCancelPropertyConfirm = () => {
    setPendingPropertyData(null);
  };

  // Handle edit property
  const handleEditProperty = (property) => {
    setEditingPropertyId(property.id);
    setPropertyFormKey(prev => prev + 1); // Reset form with new data
  };

  // Handle delete property confirmation
  const handleDeleteClick = (propertyId) => {
    setDeletingPropertyId(propertyId);
  };

  // Handle delete property
  const handleDeleteProperty = async (propertyId) => {
    setLoading(true);
    try {
      const response = await apiClient.deleteProperty(propertyId);
      
      if (response.success) {
        setProperties(prev => prev.filter(p => p.id !== propertyId));
        if (selectedPropertyId === propertyId) {
          setSelectedPropertyId(properties.length > 1 ? properties.find(p => p.id !== propertyId)?.id || null : null);
        }
        if (editingPropertyId === propertyId) {
          setEditingPropertyId(null);
          setPropertyFormKey(prev => prev + 1);
        }
        setDeletingPropertyId(null);
        addToast("Property deleted successfully!", { type: "success" });
      } else {
        throw new Error(response.error || "Failed to delete property");
      }
    } catch (error) {
      console.error("Error deleting property:", error);
      addToast(error.message || "Failed to delete property", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Cancel delete confirmation
  const handleCancelDelete = () => {
    setDeletingPropertyId(null);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingPropertyId(null);
    setPropertyFormKey(prev => prev + 1);
    setShowAddPropertyForm(false);
  };

  // Step 4: Advance to step 5 (financial data)
  const handleContinueToStep5 = () => {
    // Save step to sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('onboarding_current_step', '5');
    }
    // Advance to step 5 directly
    setCurrentStep(5);
  };

  // Step 4: Complete onboarding (skip financial data)
  const handleComplete = () => {
    // Clear saved step when completing
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('onboarding_current_step');
      sessionStorage.removeItem('onboarding_in_progress');
      // Clear all onboarding drafts when completing
      clearAllOnboardingDrafts();
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
  const isModalMode = modal || currentStep === 5;
  
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

      {/* Always show step indicator at the top */}
      <div className={isModalMode ? 'mb-6' : 'mb-8'}>
        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
      </div>

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

              <div className="flex justify-between">
                {modal && (
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      if (onComplete) onComplete();
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button onClick={handleCreateAccount} loading={loading}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Add Another Property (Manual Entry Only) */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Add Your Investment Properties</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter your property details below
                </p>
              </div>

              {/* Delete Confirmation Dialog - Show prominently at top */}
              {deletingPropertyId && (
                <div className="mb-6 p-5 bg-red-50 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-600 rounded-lg shadow-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 mt-0.5">
                      <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-bold text-red-900 dark:text-red-100 mb-1">
                        Delete Property?
                      </h4>
                      <p className="text-sm text-red-800 dark:text-red-200">
                        Are you sure you want to delete this property? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="secondary"
                      onClick={handleCancelDelete}
                      disabled={loading}
                      className="min-w-[100px]"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleDeleteProperty(deletingPropertyId)}
                      loading={loading}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700 text-white border-red-600 min-w-[140px] font-semibold"
                    >
                      {loading ? 'Deleting...' : 'Confirm Delete'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Show property list first if not editing */}
              {properties.length > 0 && !editingPropertyId && (
                <div className="mb-6 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Added Properties ({properties.length})
                  </h3>
                  <div className="space-y-2">
                    {properties.map((prop, idx) => (
                      <div 
                        key={prop.id || idx} 
                        className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {prop.nickname || prop.address || `Property ${idx + 1}`}
                          </p>
                          {prop.address && prop.nickname && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {prop.address}
                            </p>
                          )}
                          <div className="flex gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                            {(prop.propertyType || prop.property_type) && (
                              <span>Type: {prop.propertyType || prop.property_type}</span>
                            )}
                            {(prop.purchasePrice || prop.purchase_price) && (
                              <span>Price: ${parseFloat(prop.purchasePrice || prop.purchase_price || 0).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditProperty(prop)}
                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors group"
                            title="Edit property"
                          >
                            <Edit className="w-4 h-4 text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(prop.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
                            title="Delete property"
                            disabled={loading || deletingPropertyId}
                          >
                            <Trash2 className="w-4 h-4 text-gray-500 group-hover:text-red-600 dark:group-hover:text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Add Another Property Button */}
                  {!pendingPropertyData && !showAddPropertyForm && (
                    <div className="pt-3 space-y-3">
                      <Button
                        onClick={() => {
                          setPropertyFormKey(prev => prev + 1);
                          setShowAddPropertyForm(true);
                        }}
                        variant="secondary"
                        className="w-full"
                      >
                        Add Another Property
                      </Button>
                      <Button
                        onClick={() => {
                          setCurrentStep(4);
                        }}
                        className="w-full"
                      >
                        Continue to Review
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Property Confirmation Dialog */}
              {pendingPropertyData && (
                <div className="mb-6 p-5 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-600 rounded-lg shadow-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-100 mb-2">
                        Confirm Property Details
                      </h4>
                      <div className="text-sm text-emerald-800 dark:text-emerald-200 space-y-1">
                        {pendingPropertyData.nickname && (
                          <p><strong>Name:</strong> {pendingPropertyData.nickname}</p>
                        )}
                        {pendingPropertyData.address && (
                          <p><strong>Address:</strong> {pendingPropertyData.address}</p>
                        )}
                        {pendingPropertyData.propertyType && (
                          <p><strong>Type:</strong> {pendingPropertyData.propertyType}</p>
                        )}
                        {pendingPropertyData.purchasePrice && (
                          <p><strong>Purchase Price:</strong> ${parseFloat(pendingPropertyData.purchasePrice).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="secondary"
                      onClick={handleCancelPropertyConfirm}
                      disabled={loading}
                      className="min-w-[100px]"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleAddProperty(pendingPropertyData)}
                      loading={loading}
                      disabled={loading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 min-w-[140px] font-semibold"
                    >
                      {loading ? 'Adding...' : 'Confirm & Add Property'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Property Form - show when adding new or editing */}
              {(!properties.length || editingPropertyId || showAddPropertyForm) && !pendingPropertyData && (
                <PropertyForm
                  key={propertyFormKey}
                  accountId={accountId}
                  initialData={editingPropertyId ? properties.find(p => p.id === editingPropertyId) : {}}
                  onSubmit={handlePropertyFormSubmit}
                  onCancel={editingPropertyId ? handleCancelEdit : (properties.length > 0 ? () => setShowAddPropertyForm(false) : () => setCurrentStep(1))}
                  onContinue={() => {
                    if (properties.length > 0) {
                      setCurrentStep(4);
                    } else {
                      handleSkip();
                    }
                  }}
                />
              )}
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
                <Button variant="secondary" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
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
    // If modal prop is true, render without the fixed overlay (parent handles it)
    if (modal) {
      return (
        <div className="relative w-full h-full flex flex-col min-h-0">
          {/* Modal Header with Close Button */}
          <div className="flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Complete Your Onboarding
            </h2>
            <button
              onClick={handleComplete}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Modal Content with Step Indicator */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {wizardContent}
          </div>
        </div>
      );
    }
    
    // Original modal mode for step 5 when not called from portfolio page
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

