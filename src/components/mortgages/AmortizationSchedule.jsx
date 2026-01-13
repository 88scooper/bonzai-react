"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { calculateAmortizationSchedule } from "@/utils/mortgageCalculator";
import { ChevronLeft, ChevronRight, Download, FileText, FileSpreadsheet } from "lucide-react";
import { formatCurrency } from "@/utils/formatting";
import { useVirtualizer } from "@tanstack/react-virtual";

export default function AmortizationSchedule({ mortgage, propertyName, onClose }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [schedule, setSchedule] = useState(null);
  const downloadMenuRef = useRef(null);
  const parentRef = useRef(null);
  const paymentsPerPage = 12; // Show 12 payments per page (1 year)

  // Calculate amortization schedule with loading state
  useEffect(() => {
    if (!mortgage) {
      setSchedule(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = calculateAmortizationSchedule(mortgage);
      setSchedule(result);
    } catch (error) {
      console.error("Error calculating amortization schedule:", error);
      setSchedule(null);
    } finally {
      setIsLoading(false);
    }
  }, [mortgage]);

  // Virtualization setup
  const virtualizer = useVirtualizer({
    count: schedule?.payments?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Estimated row height
    overscan: 10, // Render 10 extra rows for smooth scrolling
  });

  // Pagination logic
  const totalPages = schedule ? Math.ceil(schedule.payments.length / paymentsPerPage) : 1;
  const startIndex = (currentPage - 1) * paymentsPerPage;
  const endIndex = startIndex + paymentsPerPage;
  const currentPayments = schedule ? schedule.payments.slice(startIndex, endIndex) : [];

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const handleDownload = (format) => {
    if (!schedule || !mortgage) return;
    
    // Generate a unique mortgage ID for the API call
    const mortgageId = `mortgage-${mortgage.lender}-${mortgage.originalAmount}-${mortgage.interestRate}`.replace(/[^a-zA-Z0-9-]/g, '-');
    
    // Make API call to download the file
    const downloadUrl = `/api/mortgages/${encodeURIComponent(mortgageId)}/download?format=${format}&propertyName=${encodeURIComponent(propertyName)}&lender=${encodeURIComponent(mortgage.lender)}&originalAmount=${mortgage.originalAmount}&interestRate=${mortgage.interestRate}&amortizationYears=${mortgage.amortizationYears}&paymentFrequency=${mortgage.paymentFrequency}&startDate=${mortgage.startDate}`;
    
    // Trigger download
    window.location.href = downloadUrl;
    setShowDownloadMenu(false);
  };

  const handleExportCSV = () => {
    handleDownload('csv');
  };

  const handleExportPDF = () => {
    handleDownload('pdf');
  };

  // Close download menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setShowDownloadMenu(false);
      }
    };

    if (showDownloadMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDownloadMenu]);

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#205A3E] mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Calculating Schedule</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Please wait while we calculate the amortization schedule...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!mortgage) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">No Mortgage Selected</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Please select a property to view its mortgage schedule.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (!schedule) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">Unable to Calculate Schedule</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              There was an error calculating the amortization schedule for this mortgage.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Amortization Schedule
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                {propertyName} - {mortgage.lender}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">Total Payments</p>
              <p className="text-lg font-semibold">{schedule.totalPayments}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">Total Interest</p>
              <p className="text-lg font-semibold">{formatCurrency(schedule.totalInterest)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">Final Payment</p>
              <p className="text-lg font-semibold">{schedule.finalPaymentDate}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">Payment Frequency</p>
              <p className="text-lg font-semibold">{mortgage.paymentFrequency}</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {schedule.payments.length} payments • Virtualized for performance
            </span>
          </div>
          
          <div className="relative" ref={downloadMenuRef}>
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              <span>Download Schedule</span>
            </button>
            
            {showDownloadMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <div className="py-1">
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-3" />
                    Download as CSV
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <FileText className="w-4 h-4 mr-3" />
                    Download as PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Virtualized Table */}
        <div className="overflow-x-auto max-h-96">
          <div className="w-full text-sm">
            {/* Table Header */}
            <div className="bg-gray-50 dark:bg-gray-700 sticky top-0 grid grid-cols-6 gap-4 px-4 py-3 font-medium text-gray-900 dark:text-white">
              <div className="text-left">Payment #</div>
              <div className="text-left">Date</div>
              <div className="text-right">Payment</div>
              <div className="text-right">Principal</div>
              <div className="text-right">Interest</div>
              <div className="text-right">Balance</div>
            </div>
            
            {/* Virtualized Table Body */}
            <div 
              ref={parentRef}
              className="overflow-auto"
              style={{ height: '400px' }}
            >
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const payment = schedule.payments[virtualItem.index];
                  return (
                    <div
                      key={virtualItem.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      <div className="grid grid-cols-6 gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <div className="text-gray-900 dark:text-white">{payment.paymentNumber}</div>
                        <div className="text-gray-600 dark:text-gray-300">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </div>
                        <div className="text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(payment.monthlyPayment)}
                        </div>
                        <div className="text-right text-green-600 dark:text-green-400">
                          {formatCurrency(payment.principal)}
                        </div>
                        <div className="text-right text-red-600 dark:text-red-400">
                          {formatCurrency(payment.interest)}
                        </div>
                        <div className="text-right text-gray-600 dark:text-gray-300">
                          {formatCurrency(payment.remainingBalance)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Total payments: {schedule.payments.length} • Scroll to view all payments
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
