import { NextResponse } from 'next/server';
import { authenticateRequest, createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { bulkImportRowSchema, transformBulkImportRow } from '@/lib/mortgage-validation';
import { mockMortgages, addMockMortgage } from '@/lib/mock-data';
import { z } from 'zod';

// Constants for file upload limits
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 500;

// POST /api/mortgages/upload - Bulk upload mortgages from CSV/Excel
export async function POST(request) {
  try {
    // Authenticate the request
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        createErrorResponse('Authentication required', 401),
        { status: 401 }
      );
    }

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json(
        createErrorResponse('No file provided', 400),
        { status: 400 }
      );
    }

    // File size validation (5MB limit)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        createErrorResponse('File size exceeds maximum limit of 5MB', 400),
        { status: 400 }
      );
    }

    // Check file type and extension
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        createErrorResponse('Invalid file type. Please upload a CSV or Excel file.', 400),
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();
    
    // Parse CSV content
    let rows;
    try {
      rows = parseCSV(fileContent);
      console.log('Parsed rows:', rows.length);
    } catch (error) {
      console.error('CSV parsing error:', error);
      return NextResponse.json(
        createErrorResponse(`Error parsing CSV: ${error.message}`, 400),
        { status: 400 }
      );
    }
    
    // Row limit validation (500 rows max)
    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        createErrorResponse(`File contains too many rows. Maximum allowed is ${MAX_ROWS} rows.`, 400),
        { status: 400 }
      );
    }
    
    if (rows.length === 0) {
      return NextResponse.json(
        createErrorResponse('No data found in file', 400),
        { status: 400 }
      );
    }

    // Process each row
    const results = {
      totalRows: rows.length,
      successful: [],
      failed: [],
      summary: {
        imported: 0,
        errors: 0
      }
    };

    for (let i = 0; i < rows.length; i++) {
      // Break condition: stop processing if we exceed 500 rows
      if (i >= MAX_ROWS) {
        results.failed.push({
          row: i + 2,
          error: `Processing stopped: file exceeds maximum of ${MAX_ROWS} rows.`,
          data: null
        });
        results.summary.errors++;
        break;
      }

      const row = rows[i];
      const rowNumber = i + 2; // +2 because CSV has header row and arrays are 0-indexed
      
      try {
        console.log(`Processing row ${rowNumber}:`, row);
        
        // Validate row data
        const validatedRow = bulkImportRowSchema.parse(row);
        console.log('Validated row:', validatedRow);
        
        // Transform to mortgage data
        const mortgageData = transformBulkImportRow(validatedRow);
        console.log('Transformed data:', mortgageData);
        
        // Add user ID and timestamps
        const newMortgage = {
          id: `mock-mortgage-${Date.now()}-${i}`,
          userId: user.uid,
          ...mortgageData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Add to mock storage (in real implementation, this would be saved to database)
        addMockMortgage(newMortgage);
        
        results.successful.push({
          row: rowNumber,
          mortgageId: newMortgage.id,
          lenderName: newMortgage.lenderName,
          originalAmount: newMortgage.originalAmount
        });
        
        results.summary.imported++;
        
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        
        let errorMessage = 'Unknown error';
        
        if (error instanceof z.ZodError && error.errors) {
          errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        results.failed.push({
          row: rowNumber,
          error: errorMessage,
          data: row
        });
        
        results.summary.errors++;
      }
    }

    return NextResponse.json(
      createSuccessResponse(results, 'Bulk import completed'),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error processing bulk upload:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 500),
      { status: 500 }
    );
  }
}

// GET /api/mortgages/upload/template - Download CSV template
export async function GET(request) {
  try {
    // Authenticate the request
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        createErrorResponse('Authentication required', 401),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download');
    
    if (download === 'template') {
      const csvTemplate = generateCSVTemplate();
      
      return new NextResponse(csvTemplate, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="mortgage_import_template.csv"',
        },
      });
    }
    
    return NextResponse.json(
      createErrorResponse('Invalid request', 400),
      { status: 400 }
    );

  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 500),
      { status: 500 }
    );
  }
}

// Helper function to parse CSV content
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    return [];
  }
  
  // Parse header row
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (values.length === 0) continue; // Skip empty lines
    
    // Create object from headers and values
    const row = {};
    headers.forEach((header, index) => {
      const cleanHeader = header.trim().toLowerCase().replace(/\s+/g, '');
      const value = values[index] ? values[index].trim() : '';
      
      // Map to expected field names
      let fieldName = cleanHeader;
      switch (cleanHeader) {
        case 'lendername':
          fieldName = 'lenderName';
          break;
        case 'originalloanamount':
          fieldName = 'originalAmount';
          break;
        case 'interestrate':
          fieldName = 'interestRate';
          break;
        case 'ratetype':
          fieldName = 'rateType';
          break;
        case 'amortizationperiod':
          fieldName = 'amortizationPeriod';
          break;
        case 'startdate':
          fieldName = 'startDate';
          break;
        case 'paymentfrequency':
          fieldName = 'paymentFrequency';
          break;
        case 'fixedpayments':
          fieldName = 'fixedPayments';
          break;
        default:
          fieldName = cleanHeader;
      }
      
      // Convert numeric fields based on the mapped field name
      if (fieldName === 'originalAmount' || fieldName === 'interestRate') {
        row[fieldName] = parseFloat(value) || 0;
      } else {
        row[fieldName] = value;
      }
    });
    
    rows.push(row);
  }
  
  return rows;
}

// Helper function to parse a single CSV line (handles quoted fields)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Helper function to generate CSV template
function generateCSVTemplate() {
  const headers = [
    'Lender Name',
    'Original Loan Amount',
    'Interest Rate',
    'Rate Type',
    'Amortization Period',
    'Term',
    'Start Date',
    'Payment Frequency',
    'Type',
    'Fixed Payments'
  ];
  
  const exampleRow = [
    'TD Bank',
    '492000',
    '5.2',
    'Fixed',
    '300 months',
    '60 months',
    '04-Feb-22',
    'Bi-weekly',
    'Closed',
    'Yes'
  ];
  
  const csvLines = [
    headers.join(','),
    exampleRow.join(',')
  ];
  
  return csvLines.join('\n');
}
