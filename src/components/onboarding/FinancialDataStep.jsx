"use client";

import { useState, useEffect } from "react";
import { useAccount } from "@/context/AccountContext";
import { useToast } from "@/context/ToastContext";
import apiClient from "@/lib/api-client";
import PropertyFinancialDataForm from "./PropertyFinancialDataForm";
import Button from "@/components/Button";
import { Loader2 } from "lucide-react";

export default function FinancialDataStep({
  propertyId,
  properties,
  accountId,
  mortgageAdded,
  tenantAdded,
  expenseAdded,
  onMortgageAdded,
  onTenantAdded,
  onExpenseAdded,
  onComplete,
  onBack,
  onExit // New prop for exiting without completing
}) {
  const { accounts, currentAccountId, properties: accountProperties } = useAccount();
  const { addToast } = useToast();
  const [property, setProperty] = useState(null);

  // Get the property details
  useEffect(() => {
    // First, try to use properties passed as prop
    if (properties && properties.length > 0) {
      setProperty(properties[0]);
      return;
    }
    
    // Second, try to use properties from AccountContext
    if (accountProperties && accountProperties.length > 0) {
      // If propertyId is specified, find that property, otherwise use first
      const targetProperty = propertyId 
        ? accountProperties.find(p => p.id === propertyId)
        : accountProperties[0];
      if (targetProperty) {
        setProperty(targetProperty);
        return;
      }
    }
    
    // If propertyId is provided and not found in context, fetch that specific property
    if (propertyId) {
      const fetchProperty = async () => {
        try {
          const response = await apiClient.getProperty(propertyId);
          if (response.success && response.data) {
            setProperty(response.data);
          }
        } catch (error) {
          console.error("Error fetching property:", error);
          // Don't show error to user, just log it
        }
      };
      fetchProperty();
      return;
    }
    
    // Last resort: try to fetch from account (only if we have accountId and no properties available)
    const accountIdToUse = accountId || currentAccountId;
    if (accountIdToUse && (!accountProperties || accountProperties.length === 0)) {
      const fetchFirstProperty = async () => {
        try {
          const response = await apiClient.getProperties(accountIdToUse, 1, 1);
          if (response.success && response.data?.data?.length > 0) {
            setProperty(response.data.data[0]);
          }
        } catch (error) {
          console.error("Error fetching properties:", error);
          // Don't show error to user, just log it
        }
      };
      fetchFirstProperty();
    }
  }, [propertyId, properties, accountProperties, accountId, currentAccountId]);

  // Show loading state if property is being fetched
  if (!property && (propertyId || accountId || currentAccountId)) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading property data...</p>
        </div>
      </div>
    );
  }

  // If no property available, show message
  if (!property) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            No property found. Please add a property first.
          </p>
          <Button onClick={onComplete}>
            Complete Setup
          </Button>
        </div>
      </div>
    );
  }

  // Use the unified form component
  return (
    <PropertyFinancialDataForm
      propertyId={property.id}
      property={property}
      accountId={accountId}
      onComplete={onComplete}
      onBack={onBack}
      onExit={onExit}
    />
  );
}

