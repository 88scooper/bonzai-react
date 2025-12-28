"use client";

import { useState, useEffect } from "react";
import { useAccount } from "@/context/AccountContext";
import { useToast } from "@/context/ToastContext";
import apiClient from "@/lib/api-client";
import Button from "@/components/Button";
import { Home, DollarSign, Receipt, CheckCircle2, ChevronDown, ChevronUp, X } from "lucide-react";

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
  onBack
}) {
  const { accounts, currentAccountId } = useAccount();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null); // 'mortgage' | 'tenant' | 'expense' | null
  const [property, setProperty] = useState(null);

  // Get the property details
  useEffect(() => {
    const fetchProperty = async () => {
      if (propertyId) {
        try {
          const response = await apiClient.getProperty(propertyId);
          if (response.success) {
            setProperty(response.data);
          }
        } catch (error) {
          console.error("Error fetching property:", error);
        }
      } else if (properties && properties.length > 0) {
        // Use the first property from the list
        setProperty(properties[0]);
      } else {
        // If no property ID or properties list, try to fetch from account
        const fetchFirstProperty = async () => {
          try {
            const accountIdToUse = accountId || currentAccountId;
            if (accountIdToUse) {
              const response = await apiClient.getProperties(accountIdToUse, 1, 1);
              if (response.success && response.data?.data?.length > 0) {
                setProperty(response.data.data[0]);
              }
            }
          } catch (error) {
            console.error("Error fetching properties:", error);
          }
        };
        fetchFirstProperty();
      }
    };
    fetchProperty();
  }, [propertyId, properties, accountId, currentAccountId]);

  // Mortgage form state
  const [mortgageData, setMortgageData] = useState({
    lender: '',
    originalAmount: '',
    interestRate: '',
    termMonths: '60',
    amortizationYears: '25',
    startDate: new Date().toISOString().split('T')[0],
  });

  // Tenant form state
  const [tenantData, setTenantData] = useState({
    name: '',
    rent: '',
    leaseStart: new Date().toISOString().split('T')[0],
    leaseEnd: '',
  });

  // Expense form state
  const [expenseData, setExpenseData] = useState({
    amount: '',
    category: 'Property Tax',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  const handleMortgageSubmit = async (e) => {
    e.preventDefault();
    if (!property?.id) {
      addToast("Property not found", { type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.saveMortgage(property.id, {
        lender: mortgageData.lender,
        original_amount: parseFloat(mortgageData.originalAmount),
        interest_rate: parseFloat(mortgageData.interestRate),
        term_months: parseInt(mortgageData.termMonths),
        amortization_years: parseInt(mortgageData.amortizationYears),
        start_date: mortgageData.startDate,
        rate_type: 'Fixed',
        payment_frequency: 'Monthly',
      });

      if (response.success) {
        addToast("Mortgage added successfully!", { type: "success" });
        onMortgageAdded();
        setExpandedSection(null);
      } else {
        throw new Error(response.error || "Failed to add mortgage");
      }
    } catch (error) {
      console.error("Error adding mortgage:", error);
      addToast(error.message || "Failed to add mortgage", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSubmit = async (e) => {
    e.preventDefault();
    if (!property?.id) {
      addToast("Property not found", { type: "error" });
      return;
    }

    setLoading(true);
    try {
      // Update property with tenant data
      const tenants = property.tenants || [];
      const newTenant = {
        name: tenantData.name,
        rent: parseFloat(tenantData.rent),
        leaseStart: tenantData.leaseStart,
        leaseEnd: tenantData.leaseEnd || 'Active',
        status: 'Active',
      };

      const updatedProperty = {
        ...property,
        tenants: [...tenants, newTenant],
        rent: {
          monthlyRent: parseFloat(tenantData.rent),
          annualRent: parseFloat(tenantData.rent) * 12,
        },
      };

      const response = await apiClient.updateProperty(property.id, updatedProperty);

      if (response.success) {
        addToast("Tenant information added successfully!", { type: "success" });
        onTenantAdded();
        setProperty(updatedProperty);
        setExpandedSection(null);
      } else {
        throw new Error(response.error || "Failed to add tenant");
      }
    } catch (error) {
      console.error("Error adding tenant:", error);
      addToast(error.message || "Failed to add tenant", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!property?.id) {
      addToast("Property not found", { type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.createExpense(property.id, {
        amount: parseFloat(expenseData.amount),
        category: expenseData.category,
        date: expenseData.date,
        description: expenseData.description || null,
      });

      if (response.success) {
        addToast("Expense added successfully!", { type: "success" });
        onExpenseAdded();
        setExpenseData({
          amount: '',
          category: 'Property Tax',
          date: new Date().toISOString().split('T')[0],
          description: '',
        });
        setExpandedSection(null);
      } else {
        throw new Error(response.error || "Failed to add expense");
      }
    } catch (error) {
      console.error("Error adding expense:", error);
      addToast(error.message || "Failed to add expense", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const propertyName = property?.nickname || property?.name || property?.address || "Your Property";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Add Financial Data</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Optionally add mortgage, income, and expense information for <strong>{propertyName}</strong>.
          You can skip any section and add this information later.
        </p>
      </div>

      {/* Mortgage Section */}
      <div className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'mortgage' ? null : 'mortgage')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${mortgageAdded ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
              <Home className={`w-5 h-5 ${mortgageAdded ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`} />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Mortgage Information
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Add your mortgage details
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mortgageAdded && (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            )}
            {expandedSection === 'mortgage' ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {expandedSection === 'mortgage' && (
          <div className="p-4 border-t border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50">
            <form onSubmit={handleMortgageSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Lender Name</label>
                  <input
                    type="text"
                    value={mortgageData.lender}
                    onChange={(e) => setMortgageData({ ...mortgageData, lender: e.target.value })}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    placeholder="e.g., Bank of Canada"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Original Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={mortgageData.originalAmount}
                    onChange={(e) => setMortgageData({ ...mortgageData, originalAmount: e.target.value })}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={mortgageData.interestRate}
                    onChange={(e) => setMortgageData({ ...mortgageData, interestRate: e.target.value })}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Term (Months)</label>
                  <select
                    value={mortgageData.termMonths}
                    onChange={(e) => setMortgageData({ ...mortgageData, termMonths: e.target.value })}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                  >
                    <option value="12">1 Year</option>
                    <option value="24">2 Years</option>
                    <option value="36">3 Years</option>
                    <option value="48">4 Years</option>
                    <option value="60">5 Years</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amortization (Years)</label>
                  <select
                    value={mortgageData.amortizationYears}
                    onChange={(e) => setMortgageData({ ...mortgageData, amortizationYears: e.target.value })}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                  >
                    <option value="15">15 Years</option>
                    <option value="20">20 Years</option>
                    <option value="25">25 Years</option>
                    <option value="30">30 Years</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    value={mortgageData.startDate}
                    onChange={(e) => setMortgageData({ ...mortgageData, startDate: e.target.value })}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setExpandedSection(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={loading}>
                  Add Mortgage
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Tenant/Income Section */}
      <div className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'tenant' ? null : 'tenant')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${tenantAdded ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
              <DollarSign className={`w-5 h-5 ${tenantAdded ? 'text-emerald-600 dark:text-emerald-400' : 'text-green-600 dark:text-green-400'}`} />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Tenant & Rent Information
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Add tenant details and monthly rent
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tenantAdded && (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            )}
            {expandedSection === 'tenant' ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {expandedSection === 'tenant' && (
          <div className="p-4 border-t border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50">
            <form onSubmit={handleTenantSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tenant Name</label>
                  <input
                    type="text"
                    value={tenantData.name}
                    onChange={(e) => setTenantData({ ...tenantData, name: e.target.value })}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    placeholder="e.g., John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Monthly Rent</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tenantData.rent}
                    onChange={(e) => setTenantData({ ...tenantData, rent: e.target.value })}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Lease Start Date</label>
                  <input
                    type="date"
                    value={tenantData.leaseStart}
                    onChange={(e) => setTenantData({ ...tenantData, leaseStart: e.target.value })}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Lease End Date (Optional)</label>
                  <input
                    type="date"
                    value={tenantData.leaseEnd}
                    onChange={(e) => setTenantData({ ...tenantData, leaseEnd: e.target.value })}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setExpandedSection(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={loading}>
                  Add Tenant
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Expense Section */}
      <div className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'expense' ? null : 'expense')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${expenseAdded ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
              <Receipt className={`w-5 h-5 ${expenseAdded ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`} />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Property Expenses
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Add recurring or one-time expenses
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {expenseAdded && (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            )}
            {expandedSection === 'expense' ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {expandedSection === 'expense' && (
          <div className="p-4 border-t border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50">
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={expenseData.amount}
                    onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={expenseData.category}
                    onChange={(e) => setExpenseData({ ...expenseData, category: e.target.value })}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                  >
                    <option value="Property Tax">Property Tax</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Condo Fees">Condo Fees</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Professional Fees">Professional Fees</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={expenseData.date}
                    onChange={(e) => setExpenseData({ ...expenseData, date: e.target.value })}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={expenseData.description}
                    onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    placeholder="e.g., Annual property tax payment"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setExpandedSection(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={loading}>
                  Add Expense
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-black/10 dark:border-white/10">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onComplete}>
          Complete Setup
        </Button>
      </div>
    </div>
  );
}

