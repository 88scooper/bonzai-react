/**
 * Schedule Parser Utility
 * Parses CSV mortgage schedules and maps to internal PaymentScheduleItem format
 */

import { validateCustomSchedule } from './mathEngine';

export interface PaymentScheduleItem {
  paymentNumber: number;
  paymentDate: string;
  monthlyPayment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

interface CSVMapping {
  paymentNumber?: string;
  paymentDate?: string;
  monthlyPayment?: string;
  principal?: string;
  interest?: string;
  remainingBalance?: string;
}

const DEFAULT_CSV_MAPPING: Required<CSVMapping> = {
  paymentNumber: 'paymentNumber',
  paymentDate: 'paymentDate',
  monthlyPayment: 'monthlyPayment',
  principal: 'principal',
  interest: 'interest',
  remainingBalance: 'remainingBalance',
};

/**
 * Parse CSV mortgage schedule
 * @param csvContent - CSV content as string
 * @param mapping - Optional column name mapping
 * @returns Object with parsed schedule and validation result
 */
export function parseMortgageScheduleCSV(
  csvContent: string,
  mapping: CSVMapping = {}
): {
  schedule: PaymentScheduleItem[];
  validation: import('./mathEngine').ScheduleValidationResult;
} {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    return {
      schedule: [],
      validation: {
        isValid: false,
        warning: 'CSV must contain at least a header row and one data row',
        finalBalance: 0,
      },
    };
  }

  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  // Create mapping from headers
  const columnMap: Record<string, number> = {};
  headers.forEach((header, index) => {
    columnMap[header.toLowerCase()] = index;
  });

  // Use provided mapping or default
  const finalMapping = { ...DEFAULT_CSV_MAPPING, ...mapping };
  
  // Find column indices
  const getColumnIndex = (key: keyof CSVMapping): number | null => {
    const mappedName = finalMapping[key];
    if (!mappedName) return null;
    
    // Try exact match first
    if (columnMap[mappedName.toLowerCase()] !== undefined) {
      return columnMap[mappedName.toLowerCase()];
    }
    
    // Try common variations
    const variations: Record<string, string[]> = {
      paymentNumber: ['payment', 'number', 'payment #', '#'],
      paymentDate: ['date', 'payment date'],
      monthlyPayment: ['payment', 'total', 'total payment', 'amount'],
      principal: ['principal', 'principal paid'],
      interest: ['interest', 'interest paid'],
      remainingBalance: ['balance', 'remaining balance', 'principal balance'],
    };
    
    const vars = variations[key] || [];
    for (const variant of vars) {
      if (columnMap[variant.toLowerCase()] !== undefined) {
        return columnMap[variant.toLowerCase()];
      }
    }
    
    return null;
  };

  const paymentNumberIdx = getColumnIndex('paymentNumber');
  const paymentDateIdx = getColumnIndex('paymentDate');
  const monthlyPaymentIdx = getColumnIndex('monthlyPayment');
  const principalIdx = getColumnIndex('principal');
  const interestIdx = getColumnIndex('interest');
  const remainingBalanceIdx = getColumnIndex('remainingBalance');

  // Parse data rows
  const schedule: PaymentScheduleItem[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line (handle quoted values)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    // Extract values
    const parseMoney = (val: string): number => {
      const cleaned = val.replace(/[$,",]/g, '').trim();
      const num = parseFloat(cleaned);
      return Number.isFinite(num) ? Math.abs(num) : 0;
    };

    const parseDate = (val: string): string => {
      // Try to parse various date formats
      const date = new Date(val);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      return val; // Return as-is if can't parse
    };

    schedule.push({
      paymentNumber: paymentNumberIdx !== null ? parseInt(values[paymentNumberIdx] || String(i)) : i,
      paymentDate: paymentDateIdx !== null ? parseDate(values[paymentDateIdx]) : '',
      monthlyPayment: monthlyPaymentIdx !== null ? parseMoney(values[monthlyPaymentIdx]) : 0,
      principal: principalIdx !== null ? parseMoney(values[principalIdx]) : 0,
      interest: interestIdx !== null ? parseMoney(values[interestIdx]) : 0,
      remainingBalance: remainingBalanceIdx !== null ? parseMoney(values[remainingBalanceIdx]) : 0,
    });
  }

  // Validate the parsed schedule
  const validation = validateCustomSchedule(schedule);
  
  return {
    schedule,
    validation,
  };
}
