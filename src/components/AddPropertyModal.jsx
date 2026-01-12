"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Building2 } from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import { useToast } from "@/context/ToastContext";
import apiClient from "@/lib/api-client";
import PropertyForm from "@/components/onboarding/PropertyForm";

export default function AddPropertyModal({ isOpen, onClose }) {
  const { currentAccountId, currentAccount, refreshAccounts } = useAccount();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleAddProperty = async (propertyData) => {
    // Prevent modifications to demo accounts
    if (currentAccount?.isDemo) {
      addToast("Cannot add properties to demo account. Demo accounts are read-only.", { type: "error" });
      return;
    }

    if (!currentAccountId) {
      addToast("Please select an account first", { type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.createProperty({
        ...propertyData,
        accountId: currentAccountId,
      });

      if (response.success) {
        addToast("Property added successfully!", { type: "success" });
        // Refresh accounts which will reload properties
        await refreshAccounts();
        onClose();
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

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  // Render using portal to document body
  if (typeof window === 'undefined' || !document.body) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-950 rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col border border-black/10 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#205A3E]/10 dark:bg-[#205A3E]/20">
              <Building2 className="w-5 h-5 text-[#205A3E] dark:text-[#66B894]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Add New Property
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Enter your property details below
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto flex-1 p-6">
          {currentAccount?.isDemo ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Demo accounts are read-only. Please sign up to create your own portfolio and add properties.
              </p>
            </div>
          ) : !currentAccountId ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Please select an account first to add a property.
              </p>
            </div>
          ) : (
            <PropertyForm
              accountId={currentAccountId}
              onSubmit={handleAddProperty}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

