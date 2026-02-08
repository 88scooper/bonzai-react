/**
 * Annual Summary Export Utilities
 * Exports annual income and expense summaries in Excel, PDF, and CSV formats
 * Matches CRA Form T776 structure with cross-tabulated layout
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { getExpenseCategoryOrder } from './craExpenseCodes';

/**
 * Transform API data into cross-tabulated format for Excel
 * Properties as columns, categories as rows
 */
export function prepareCrossTabulatedData(apiData) {
  const { year, properties } = apiData;
  
  // Get all unique expense categories across all properties
  const allCategories = new Set();
  properties.forEach(prop => {
    Object.keys(prop.expenses).forEach(cat => allCategories.add(cat));
  });

  // Build the cross-tabulated structure
  const rows = [];
  
  // Header row: Category | CRA Code | Property 1 | Property 2 | ... | TOTAL
  const headerRow = ['Category', 'CRA Code'];
  properties.forEach(prop => headerRow.push(prop.name));
  headerRow.push('TOTAL');
  rows.push(headerRow);

  // Income section
  rows.push(['ANNUAL INCOME', '', '', '']); // Section header (will be formatted)
  const incomeRow = ['Rental Income', ''];
  let incomeTotal = 0;
  properties.forEach(prop => {
    const rent = prop.annualRent || 0;
    incomeRow.push(rent);
    incomeTotal += rent;
  });
  incomeRow.push(incomeTotal);
  rows.push(incomeRow);
  rows.push(['']); // Empty row separator

  // Expenses section
  rows.push(['ANNUAL EXPENSES', '', '', '']); // Section header (will be formatted)
  
  // Get expense category order (matching CRA form)
  const expenseOrder = getExpenseCategoryOrder();
  const craCodes = {
    'Advertising': '8521',
    'Insurance': '8691',
    'Interest & Bank Charges': '8710',
    'Office Expenses': '8810',
    'Professional Fees': '8860',
    'Management & Administration': '8871',
    'Repairs & Maintenance': '8960',
    'Salaries, Wages, and Benefits': '9060',
    'Property Taxes': '9180',
    'Travel': '9200',
    'Utilities': '9220',
    'Motor Vehicle Expenses': '9281',
    'Other Expenses': '9270',
    'Condo Maintenance Fees': '',
    'Mortgage (Principal)': '',
  };

  expenseOrder.forEach(categoryName => {
    const craCode = craCodes[categoryName] || '';
    
    const row = [categoryName, craCode];
    let categoryTotal = 0;
    
    properties.forEach(prop => {
      // Try exact match first, then try variations
      let amount = prop.expenses[categoryName] || 0;
      if (amount === 0) {
        // Try variations
        if (categoryName === 'Property Taxes') {
          amount = prop.expenses['Property Tax'] || 0;
        } else if (categoryName === 'Repairs & Maintenance') {
          amount = prop.expenses['Maintenance'] || 0;
        } else if (categoryName === 'Condo Maintenance Fees') {
          amount = prop.expenses['Condo Fees'] || 0;
        } else if (categoryName === 'Management & Administration') {
          amount = prop.expenses['Management'] || 0;
        } else if (categoryName === 'Motor Vehicle Expenses') {
          amount = prop.expenses['Motor Vehicle'] || 0;
        }
      }
      row.push(amount);
      categoryTotal += amount;
    });
    
    row.push(categoryTotal);
    rows.push(row);
  });

  // Total expenses row
  const totalExpensesRow = ['TOTAL', ''];
  let grandTotal = 0;
  properties.forEach(prop => {
    const propTotal = Object.values(prop.expenses).reduce((sum, val) => sum + (Number(val) || 0), 0);
    totalExpensesRow.push(propTotal);
    grandTotal += propTotal;
  });
  totalExpensesRow.push(grandTotal);
  rows.push(totalExpensesRow);

  return rows;
}

/**
 * Export annual summary as Excel (cross-tabulated)
 */
export function exportAnnualSummaryAsExcel(apiData, year) {
  const rows = prepareCrossTabulatedData(apiData);
  
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 30 }, // Category column
    { wch: 12 }, // CRA Code column
    ...Array(apiData.properties.length + 1).fill({ wch: 18 }) // Property columns + Total
  ];

  // Apply formatting
  const range = XLSX.utils.decode_range(ws['!ref']);
  
  // Format header row
  for (let col = 0; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) continue;
    ws[cellAddress].s = {
      font: { bold: true, sz: 11 },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: { fgColor: { rgb: 'E8F5E9' } } // Light green background
    };
  }

  // Find and format section headers (ANNUAL INCOME, ANNUAL EXPENSES)
  for (let row = 0; row <= range.e.r; row++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
    if (ws[cellAddress] && ws[cellAddress].v === 'ANNUAL INCOME') {
      ws[cellAddress].s = {
        font: { bold: true, sz: 12 },
        fill: { fgColor: { rgb: 'C8E6C9' } }
      };
    } else if (ws[cellAddress] && ws[cellAddress].v === 'ANNUAL EXPENSES') {
      ws[cellAddress].s = {
        font: { bold: true, sz: 12 },
        fill: { fgColor: { rgb: 'C8E6C9' } }
      };
    }
  }

  // Format number columns (currency)
  for (let row = 1; row <= range.e.r; row++) {
    for (let col = 2; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (ws[cellAddress] && typeof ws[cellAddress].v === 'number') {
        ws[cellAddress].z = '$#,##0.00';
      }
    }
  }

  // Format TOTAL row
  for (let row = 0; row <= range.e.r; row++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
    if (ws[cellAddress] && ws[cellAddress].v === 'TOTAL') {
      for (let col = 0; col <= range.e.c; col++) {
        const totalCellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (ws[totalCellAddress]) {
          ws[totalCellAddress].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: 'F1F8E9' } }
          };
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, `Annual Summary ${year}`);
  
  // Generate filename
  const filename = `Bonzai-Schedule-of-Rental-Income-${year}-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Export annual summary as CSV
 */
export function exportAnnualSummaryAsCSV(apiData, year) {
  const rows = prepareCrossTabulatedData(apiData);
  
  // Convert to CSV format
  const csvContent = rows.map(row => 
    row.map(cell => {
      // Handle cells with commas or quotes
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell ?? '';
    }).join(',')
  ).join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Bonzai-Schedule-of-Rental-Income-${year}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export annual summary as PDF
 */
export async function exportAnnualSummaryAsPDF(apiData, year) {
  const rows = prepareCrossTabulatedData(apiData);
  
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  
  // Title
  pdf.setFontSize(18);
  pdf.setTextColor(32, 90, 62); // Bonsai green
  pdf.text('Schedule of Rental Income', pdfWidth / 2, 15, { align: 'center' });
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Tax Year: ${year}`, pdfWidth / 2, 22, { align: 'center' });
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pdfWidth / 2, 28, { align: 'center' });

  // Table settings
  const startY = 35;
  const rowHeight = 6;
  const colWidths = [50, 20, ...Array(apiData.properties.length + 1).fill(25)];
  let currentY = startY;
  const pageMargin = 10;
  const maxWidth = pdfWidth - (pageMargin * 2);

  pdf.setFontSize(9);
  
  // Draw table
  rows.forEach((row, rowIdx) => {
    // Check if we need a new page
    if (currentY > pdfHeight - 20) {
      pdf.addPage();
      currentY = 15;
    }

    let xPos = pageMargin;
    row.forEach((cell, colIdx) => {
      const cellValue = cell?.toString() || '';
      const colWidth = colWidths[colIdx] || 25;
      
      // Style section headers
      if (cellValue.includes('ANNUAL')) {
        pdf.setFont(undefined, 'bold');
        pdf.setFillColor(200, 230, 201);
        pdf.rect(xPos, currentY - 4, colWidth, rowHeight, 'F');
        pdf.setTextColor(0, 0, 0);
      }
      
      // Style header row
      if (rowIdx === 0) {
        pdf.setFont(undefined, 'bold');
        pdf.setFillColor(232, 245, 233);
        pdf.rect(xPos, currentY - 4, colWidth, rowHeight, 'F');
        pdf.setTextColor(0, 0, 0);
      }
      
      // Style TOTAL row
      if (row[0] === 'TOTAL') {
        pdf.setFont(undefined, 'bold');
        pdf.setFillColor(241, 248, 233);
        pdf.rect(xPos, currentY - 4, colWidth, rowHeight, 'F');
        pdf.setTextColor(0, 0, 0);
      }
      
      // Format numbers as currency
      let displayValue = cellValue;
      if (typeof cell === 'number' && colIdx >= 2) {
        displayValue = `$${cell.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      
      pdf.text(displayValue, xPos + 2, currentY, { maxWidth: colWidth - 4 });
      xPos += colWidth;
    });
    
    pdf.setFont(undefined, 'normal');
    currentY += rowHeight;
  });

  const filename = `Bonzai-Schedule-of-Rental-Income-${year}-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}
