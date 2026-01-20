"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api-client";
// Using admin endpoint instead of client-side import function
import Button from "@/components/Button";
import Layout from "@/components/Layout";
import { RequireAuth } from "@/context/AuthContext";

export default function ImportPropertiesPage() {
  const { user } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [result, setResult] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Load accounts on mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await apiClient.getAccounts();
        if (response.success && response.data) {
          const accountsList = response.data.data || [];
          setAccounts(accountsList);
          
          // Demo account will be found automatically by the import endpoint
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
        const newAccounts = [...accounts, response.data];
        setAccounts(newAccounts);
        setProgressMessage("Demo Account created!");
      }
    } catch (error: any) {
      setProgressMessage(`Error creating Demo Account: ${error.message}`);
    }
  };

  const handleImport = async () => {
    if (!confirm("This will import demo properties from code files into the database. Existing demo properties will be replaced. Continue?")) {
      return;
    }

    setIsImporting(true);
    setProgressMessage("Starting import via admin endpoint...");
    setResult(null);

    try {
      // Use admin endpoint which handles demo account lookup correctly
      const response = await fetch('/api/admin/import-properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          demo: {
            propertiesCreated: data.data.results.demo.properties,
            mortgagesCreated: data.data.results.demo.mortgages,
            expensesCreated: data.data.results.demo.expenses,
            errors: data.data.results.demo.errors,
          },
        });
        setProgressMessage("Import complete!");
      } else {
        setResult({
          success: false,
          error: data.error || 'Import failed',
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
      });
      setProgressMessage(`Import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <RequireAuth>
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Import Demo Properties from Code</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Import demo properties from code files into the database.
            </p>
          </div>

          <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6 space-y-4">
            <h2 className="text-xl font-semibold">Demo Account Import</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Demo Account</label>
                {accounts.find((a: any) => a.is_demo) ? (
                  <div className="px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <p className="text-sm">Demo Account will be found automatically for demo@bonzai.io user</p>
                  </div>
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
            </div>

            <Button
              onClick={handleImport}
              disabled={isImporting}
              className="w-full"
            >
              {isImporting ? "Importing..." : "Import Demo Properties"}
            </Button>
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

