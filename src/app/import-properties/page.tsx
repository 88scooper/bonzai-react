"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api-client";
import { importPropertiesFromCode } from "@/lib/import-properties-from-code";
import Button from "@/components/Button";
import Layout from "@/components/Layout";
import { RequireAuth } from "@/context/AuthContext";

export default function ImportPropertiesPage() {
  const { user } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [result, setResult] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [demoAccountId, setDemoAccountId] = useState("");
  const [scAccountId, setScAccountId] = useState("");

  // Load accounts on mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await apiClient.getAccounts();
        if (response.success && response.data) {
          const accountsList = response.data.data || [];
          setAccounts(accountsList);
          
          // Auto-select accounts
          const demoAccount = accountsList.find((a: any) => 
            (a.name === "Demo Account" || a.name?.toLowerCase().includes("demo")) || a.is_demo
          );
          const scAccount = accountsList.find((a: any) => 
            a.name === "SC Properties" || a.name?.toLowerCase().includes("sc properties")
          );
          
          if (demoAccount) setDemoAccountId(demoAccount.id);
          if (scAccount) setScAccountId(scAccount.id);
          
          // If no accounts found, log for debugging
          if (accountsList.length > 0 && (!demoAccount || !scAccount)) {
            console.log('Available accounts:', accountsList.map((a: any) => ({ name: a.name, id: a.id, is_demo: a.is_demo })));
          }
        }
      } catch (error) {
        console.error("Error loading accounts:", error);
      }
    };
    loadAccounts();
  }, []);

  const handleCreateDemoAccount = async () => {
    try {
      const response = await apiClient.createAccount("Demo Account", undefined, true);
      if (response.success && response.data) {
        setDemoAccountId(response.data.id);
        const newAccounts = [...accounts, response.data];
        setAccounts(newAccounts);
        setProgressMessage("Demo Account created!");
      }
    } catch (error: any) {
      setProgressMessage(`Error creating Demo Account: ${error.message}`);
    }
  };

  const handleImport = async () => {
    if (!demoAccountId || !scAccountId) {
      setProgressMessage("Please ensure both Demo Account and SC Properties account exist");
      return;
    }

    if (!confirm("This will import properties from code files into the database. Continue?")) {
      return;
    }

    setIsImporting(true);
    setProgressMessage("Starting import...");
    setResult(null);

    try {
      const importResult = await importPropertiesFromCode(
        demoAccountId,
        scAccountId,
        (message) => setProgressMessage(message)
      );

      setResult(importResult);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <RequireAuth>
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Import Properties from Code</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Import properties from code files and assign them to the correct accounts.
            </p>
          </div>

          <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6 space-y-4">
            <h2 className="text-xl font-semibold">Account Assignment</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Demo Account</label>
                {accounts.find((a: any) => a.id === demoAccountId) ? (
                  <select
                    value={demoAccountId}
                    onChange={(e) => setDemoAccountId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {accounts.map((account: any) => (
                      <option key={account.id} value={account.id}>
                        {account.name} {account.is_demo ? "(Demo)" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Demo Account not found</p>
                    <Button onClick={handleCreateDemoAccount}>Create Demo Account</Button>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Properties: First St, Second Dr, Third Avenue
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">SC Properties Account</label>
                {accounts.length > 0 ? (
                  <select
                    value={scAccountId}
                    onChange={(e) => setScAccountId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
                  >
                    <option value="">Select SC Properties account...</option>
                    {accounts.map((account: any) => (
                      <option key={account.id} value={account.id}>
                        {account.name} {account.is_demo ? "(Demo)" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-red-600">No accounts found. Please create accounts first.</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Properties: 403-311 Richmond St E, 317-30 Tretti Way, 415-500 Wilson Ave
                </p>
              </div>
            </div>

            <Button
              onClick={handleImport}
              disabled={isImporting || !demoAccountId || !scAccountId}
              className="w-full"
            >
              {isImporting ? "Importing..." : "Import Properties"}
            </Button>
            {(!demoAccountId || !scAccountId) && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                {!demoAccountId && "⚠️ Please select a Demo Account. "}
                {!scAccountId && "⚠️ Please select an SC Properties Account from the dropdown above."}
              </p>
            )}
          </div>

          {progressMessage && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">{progressMessage}</p>
            </div>
          )}

          {result && (
            <div className={`rounded-lg border p-6 ${
              result.success
                ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
            }`}>
              <h2 className={`text-xl font-semibold mb-4 ${
                result.success
                  ? "text-green-800 dark:text-green-200"
                  : "text-red-800 dark:text-red-200"
              }`}>
                {result.success ? "Import Complete!" : "Import Failed"}
              </h2>

              {result.demo && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Demo Account:</h3>
                  <div className="text-sm space-y-1">
                    <div>Properties: {result.demo.propertiesCreated}</div>
                    <div>Mortgages: {result.demo.mortgagesCreated}</div>
                    <div>Expenses: {result.demo.expensesCreated}</div>
                    {result.demo.errors.length > 0 && (
                      <div className="text-red-600">
                        Errors: {result.demo.errors.length}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {result.scProperties && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">SC Properties Account:</h3>
                  <div className="text-sm space-y-1">
                    <div>Properties: {result.scProperties.propertiesCreated}</div>
                    <div>Mortgages: {result.scProperties.mortgagesCreated}</div>
                    <div>Expenses: {result.scProperties.expensesCreated}</div>
                    {result.scProperties.errors.length > 0 && (
                      <div className="text-red-600">
                        Errors: {result.scProperties.errors.length}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {result.error && (
                <div className="text-red-600 text-sm">{result.error}</div>
              )}
            </div>
          )}
        </div>
      </Layout>
    </RequireAuth>
  );
}

