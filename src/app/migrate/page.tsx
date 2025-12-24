"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { migrateLocalStorageToDatabase, hasLocalStorageData } from "@/lib/migrate-localStorage-to-db";
import Button from "@/components/Button";
import Layout from "@/components/Layout";
import { RequireAuth } from "@/context/AuthContext";

export default function MigratePage() {
  const { user } = useAuth();
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [result, setResult] = useState<any>(null);
  const [hasData, setHasData] = useState(false);

  // Check for localStorage data on mount
  useEffect(() => {
    setHasData(hasLocalStorageData());
  }, []);

  const handleMigrate = async () => {
    if (!confirm("This will migrate all data from localStorage to the database. Continue?")) {
      return;
    }

    setIsMigrating(true);
    setProgress(0);
    setProgressMessage("Starting migration...");
    setResult(null);

    try {
      const migrationResult = await migrateLocalStorageToDatabase((message, progressValue) => {
        setProgressMessage(message);
        if (progressValue !== undefined) {
          setProgress(progressValue);
        }
      });

      setResult(migrationResult);
    } catch (error: any) {
      setResult({
        success: false,
        errors: [error.message || "Migration failed"],
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <RequireAuth>
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Data Migration</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Migrate your data from localStorage to the Neon database.
            </p>
          </div>

          {!hasData && (
            <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4">
              <p className="text-yellow-800 dark:text-yellow-200">
                No data found in localStorage to migrate.
              </p>
            </div>
          )}

          {hasData && !result && (
            <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6">
              <h2 className="text-xl font-semibold mb-4">Ready to Migrate</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                This will migrate all accounts, properties, mortgages, and expenses from localStorage to the database.
              </p>
              <Button 
                onClick={handleMigrate} 
                disabled={isMigrating}
                className="w-full sm:w-auto"
              >
                {isMigrating ? "Migrating..." : "Start Migration"}
              </Button>
            </div>
          )}

          {isMigrating && (
            <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6">
              <h2 className="text-xl font-semibold mb-4">Migration in Progress</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">{progressMessage}</span>
                    <span className="text-gray-600 dark:text-gray-400">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-[#205A3E] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
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
                {result.success ? "Migration Complete!" : "Migration Failed"}
              </h2>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Accounts Created:</span>
                  <span className="font-semibold">{result.accountsCreated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Properties Created:</span>
                  <span className="font-semibold">{result.propertiesCreated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Mortgages Created:</span>
                  <span className="font-semibold">{result.mortgagesCreated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Expenses Created:</span>
                  <span className="font-semibold">{result.expensesCreated}</span>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                    Errors ({result.errors.length}):
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
                    {result.errors.map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.success && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your data has been successfully migrated to the database. You can now access it from any device.
                  </p>
                  <Button 
                    onClick={() => window.location.href = "/my-properties"}
                    className="mt-4"
                  >
                    View Properties
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Layout>
    </RequireAuth>
  );
}

