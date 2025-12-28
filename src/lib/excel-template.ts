import * as XLSX from 'xlsx';

/**
 * Generates and downloads an Excel template file for property bulk upload
 */
export function downloadPropertyTemplate() {
  // Add instruction note
  const instructionRow = [
    'NOTE: The row below (Main Street Property) is an EXAMPLE ONLY. Please delete it and add your own property data.',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ];

  // Define the headers with user-friendly names
  const headers = [
    'Property Name',
    'Address',
    'Purchase Price',
    'Purchase Date',
    'Closing Costs',
    'Renovation Costs',
    'Initial Renovations',
    'Current Market Value',
    'Year Built',
    'Property Type',
    'Size (sq ft)',
    'Unit Config'
  ];

  // Add example data row to help users understand the format
  const exampleRow = [
    'Main Street Property',
    '123 Main St, Toronto, ON M5H 2N2',
    450000,
    '2023-01-15',
    15000,
    25000,
    10000,
    500000,
    1995,
    'Single Family',
    1500,
    '1 Bed, 1 Bath'
  ];

  // Create worksheet data
  const worksheetData = [
    instructionRow,
    headers,
    exampleRow
  ];

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths for better readability
  const columnWidths = [
    { wch: 60 }, // Instruction note (wider for the note)
    { wch: 35 }, // Address
    { wch: 15 }, // Purchase Price
    { wch: 15 }, // Purchase Date
    { wch: 15 }, // Closing Costs
    { wch: 18 }, // Renovation Costs
    { wch: 20 }, // Initial Renovations
    { wch: 20 }, // Current Market Value
    { wch: 12 }, // Year Built
    { wch: 18 }, // Property Type
    { wch: 15 }, // Size
    { wch: 20 }  // Unit Config
  ];
  worksheet['!cols'] = columnWidths;

  // Style the instruction row (make it stand out)
  const instructionCellAddress = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (worksheet[instructionCellAddress]) {
    worksheet[instructionCellAddress].s = {
      font: { bold: true, color: { rgb: 'FF0000' } }, // Red and bold
      fill: { fgColor: { rgb: 'FFF4E6' } } // Light orange background
    };
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Properties');

  // Generate filename with current date
  const date = new Date().toISOString().split('T')[0];
  const filename = `Property_Template_${date}.xlsx`;

  // Write file and trigger download
  // Note: XLSX.writeFile works in browser environments
  try {
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error('Error downloading template:', error);
    // Fallback: create a blob and download
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

