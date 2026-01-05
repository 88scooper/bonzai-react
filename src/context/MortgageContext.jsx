"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Note: This context is legacy and uses mock functions
// New mortgage functionality should use the /api/properties/[id]/mortgage endpoints
// and the useMortgages hook from @/hooks/useMortgages

const MortgageContext = createContext();

export const MortgageProvider = ({ children }) => {
  const { user } = useAuth();
  const [mortgages, setMortgages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load mortgages when user changes
  useEffect(() => {
    if (!user?.uid) {
      setMortgages([]);
      setLoading(false);
      return;
    }

    // Don't load mock data - new accounts should start empty
    // Mortgages are now loaded through AccountContext via API
    setMortgages([]);
    setLoading(false);
    setError(null);
  }, [user?.uid]);

  // Add a new mortgage (mock implementation)
  const addNewMortgage = async (mortgageData) => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    // Mock implementation - mortgages should be created via API
    const mockMortgage = {
      id: `mock-mortgage-${Date.now()}`,
      ...mortgageData,
      userId: user.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setMortgages(prev => [mockMortgage, ...prev]);
    return mockMortgage.id;
  };

  // Update an existing mortgage (mock implementation)
  const updateExistingMortgage = async (mortgageId, mortgageData) => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    // Mock implementation - mortgages should be updated via API
    setMortgages(prev => prev.map(mortgage => 
      mortgage.id === mortgageId 
        ? { ...mortgage, ...mortgageData, updatedAt: new Date() }
        : mortgage
    ));
  };

  // Delete a mortgage (mock implementation)
  const removeMortgage = async (mortgageId) => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    // Mock implementation - mortgages should be deleted via API
    setMortgages(prev => prev.filter(mortgage => mortgage.id !== mortgageId));
  };

  // Get a single mortgage (mock implementation)
  const getSingleMortgage = async (mortgageId) => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    // Mock implementation
    return mortgages.find(mortgage => mortgage.id === mortgageId) || null;
  };

  // Get mortgages for a specific property (mock implementation)
  const getPropertyMortgages = async (propertyId) => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    // Mock implementation
    return mortgages.filter(mortgage => mortgage.propertyId === propertyId);
  };

  // Calculate mortgage payment
  const calculateMortgagePayment = (principal, annualRate, years, frequency = 'MONTHLY') => {
    if (principal <= 0 || annualRate < 0 || years <= 0) return 0;

    const rate = annualRate / 100;
    const periodsPerYear = frequency === 'MONTHLY' ? 12 : 
                          frequency === 'BIWEEKLY' ? 26 : 
                          frequency === 'WEEKLY' ? 52 : 12;
    
    const totalPeriods = years * periodsPerYear;
    const periodRate = rate / periodsPerYear;

    if (periodRate === 0) {
      return principal / totalPeriods;
    }

    return principal * (periodRate * Math.pow(1 + periodRate, totalPeriods)) / 
           (Math.pow(1 + periodRate, totalPeriods) - 1);
  };

  // Calculate remaining balance
  const calculateRemainingBalance = (principal, annualRate, years, paymentsMade, frequency = 'MONTHLY') => {
    if (principal <= 0 || annualRate < 0 || years <= 0) return principal;

    const rate = annualRate / 100;
    const periodsPerYear = frequency === 'MONTHLY' ? 12 : 
                          frequency === 'BIWEEKLY' ? 26 : 
                          frequency === 'WEEKLY' ? 52 : 12;
    
    const totalPeriods = years * periodsPerYear;
    const periodRate = rate / periodsPerYear;
    const payment = calculateMortgagePayment(principal, annualRate, years, frequency);

    if (periodRate === 0) {
      return Math.max(0, principal - (payment * paymentsMade));
    }

    const remainingPeriods = totalPeriods - paymentsMade;
    if (remainingPeriods <= 0) return 0;

    return payment * (1 - Math.pow(1 + periodRate, -remainingPeriods)) / periodRate;
  };

  const value = {
    mortgages,
    loading,
    error,
    addNewMortgage,
    updateExistingMortgage,
    removeMortgage,
    getSingleMortgage,
    getPropertyMortgages,
    calculateMortgagePayment,
    calculateRemainingBalance
  };

  return (
    <MortgageContext.Provider value={value}>
      {children}
    </MortgageContext.Provider>
  );
};

export const useMortgages = () => {
  const context = useContext(MortgageContext);
  if (context === undefined) {
    throw new Error('useMortgages must be used within a MortgageProvider');
  }
  return context;
};
