import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createPropertySchema } from '@/lib/validations/property.schema';
import { bulkUploadFormSchema } from '@/lib/validations/upload.schema';
import { sql } from '@/lib/db';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils.js';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

interface Property {
  id: string;
  account_id: string;
  nickname: string | null;
  address: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
  closing_costs: number | null;
  renovation_costs: number | null;
  initial_renovations: number | null;
  current_market_value: number | null;
  year_built: number | null;
  property_type: string | null;
  size: number | null;
  unit_config: string | null;
  property_data: any;
  created_at: Date;
  updated_at: Date;
}

/**
 * POST /api/properties/bulk-upload
 * Bulk upload properties from Excel/CSV file
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json(
      createErrorResponse('Authentication required', 401),
      { status: 401 }
    );
  }

  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const accountId = formData.get('accountId') as string | null;

    // Validate formData structure with Zod
    const formValidation = bulkUploadFormSchema.safeParse({
      file: file || undefined,
      accountId: accountId || undefined,
    });

    if (!formValidation.success) {
      const errorMessages = formValidation.error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return NextResponse.json(
        createErrorResponse(`Validation failed: ${errorMessages}`, 400),
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        createErrorResponse('No file provided', 400),
        { status: 400 }
      );
    }

    // File size validation (5MB limit) - redundant but explicit
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        createErrorResponse('File size exceeds maximum limit of 5MB', 400),
        { status: 400 }
      );
    }

    if (!accountId) {
      return NextResponse.json(
        createErrorResponse('Account ID is required', 400),
        { status: 400 }
      );
    }

    // Verify account belongs to user
    const accountCheck = await sql`
      SELECT id FROM accounts
      WHERE id = ${accountId} AND user_id = ${user.id}
      LIMIT 1
    ` as Array<{ id: string }>;

    if (!accountCheck[0]) {
      return NextResponse.json(
        createErrorResponse('Account not found', 404),
        { status: 404 }
      );
    }

    // Check file type
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const allowedExtensions = ['csv', 'xlsx', 'xls'];
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        createErrorResponse('Invalid file type. Please upload a CSV or Excel file.', 400),
        { status: 400 }
      );
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Row limit validation (500 rows max, excluding header)
    const MAX_ROWS = 500;
    const dataRows = jsonData.length - 1; // Exclude header row
    
    if (dataRows > MAX_ROWS) {
      return NextResponse.json(
        createErrorResponse(`File contains too many rows. Maximum allowed is ${MAX_ROWS} rows.`, 400),
        { status: 400 }
      );
    }
    
    if (jsonData.length < 2) {
      return NextResponse.json(
        createErrorResponse('File must contain at least a header row and one data row', 400),
        { status: 400 }
      );
    }

    // Parse header row
    const headers = (jsonData[0] as any[]).map((h: any) => String(h || '').trim().toLowerCase());
    
    // Helper to find column index by various possible header names
    const findColumn = (possibleNames: string[]): number => {
      for (const name of possibleNames) {
        const idx = headers.findIndex(h => h.includes(name));
        if (idx >= 0) return idx;
      }
      return -1;
    };

    // Map headers to property fields
    const columnMap = {
      nickname: findColumn(['nickname', 'name', 'property name']),
      address: findColumn(['address', 'property address', 'location']),
      purchasePrice: findColumn(['purchase price', 'price', 'purchase_price', 'cost']),
      purchaseDate: findColumn(['purchase date', 'purchase_date', 'date', 'closing date']),
      closingCosts: findColumn(['closing costs', 'closing_costs', 'closing']),
      renovationCosts: findColumn(['renovation costs', 'renovation_costs', 'renovation']),
      initialRenovations: findColumn(['initial renovations', 'initial_renovations']),
      currentMarketValue: findColumn(['market value', 'current market value', 'market_value', 'current_value']),
      yearBuilt: findColumn(['year built', 'year_built', 'year']),
      propertyType: findColumn(['property type', 'property_type', 'type']),
      size: findColumn(['size', 'square feet', 'sqft', 'square footage']),
      unitConfig: findColumn(['unit config', 'unit_config', 'units', 'unit type']),
    };

    // Process each row
    const properties: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      // Break condition: stop processing if we exceed 500 rows
      if (i > MAX_ROWS + 1) { // +1 because we start at index 1 (after header)
        errors.push(`Processing stopped: file exceeds maximum of ${MAX_ROWS} data rows.`);
        break;
      }

      const row = jsonData[i] as any[];
      
      // Skip empty rows
      if (!row || row.length === 0 || row.every(cell => !cell || String(cell).trim() === '')) {
        continue;
      }

      // Build property object
      const propertyData: any = {
        accountId,
        nickname: columnMap.nickname >= 0 ? String(row[columnMap.nickname] || '').trim() : null,
        address: columnMap.address >= 0 ? String(row[columnMap.address] || '').trim() : null,
        purchasePrice: columnMap.purchasePrice >= 0 ? parseFloat(String(row[columnMap.purchasePrice] || '0')) : undefined,
        purchaseDate: columnMap.purchaseDate >= 0 ? formatDate(String(row[columnMap.purchaseDate] || '')) : undefined,
        closingCosts: columnMap.closingCosts >= 0 ? parseFloat(String(row[columnMap.closingCosts] || '0')) : 0,
        renovationCosts: columnMap.renovationCosts >= 0 ? parseFloat(String(row[columnMap.renovationCosts] || '0')) : 0,
        initialRenovations: columnMap.initialRenovations >= 0 ? parseFloat(String(row[columnMap.initialRenovations] || '0')) : 0,
        currentMarketValue: columnMap.currentMarketValue >= 0 ? parseFloat(String(row[columnMap.currentMarketValue] || '0')) : undefined,
        yearBuilt: columnMap.yearBuilt >= 0 ? parseInt(String(row[columnMap.yearBuilt] || '0')) : undefined,
        propertyType: columnMap.propertyType >= 0 ? String(row[columnMap.propertyType] || '').trim() : undefined,
        size: columnMap.size >= 0 ? parseFloat(String(row[columnMap.size] || '0')) : undefined,
        unitConfig: columnMap.unitConfig >= 0 ? String(row[columnMap.unitConfig] || '').trim() : undefined,
      };

      // Remove undefined values
      Object.keys(propertyData).forEach(key => {
        if (propertyData[key] === undefined) {
          delete propertyData[key];
        }
      });

      // Validate property
      const validationResult = createPropertySchema.safeParse(propertyData);
      
      if (!validationResult.success) {
        const rowNum = i + 1;
        const errorMessages = validationResult.error.issues
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        errors.push(`Row ${rowNum}: ${errorMessages}`);
        continue;
      }

      properties.push(validationResult.data);
    }

    if (properties.length === 0) {
      return NextResponse.json(
        createErrorResponse('No valid properties found in file', 400),
        { status: 400 }
      );
    }

    // Insert properties in batch
    const createdProperties: Property[] = [];
    const failedProperties: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < properties.length; i++) {
      const prop = properties[i];
      try {
        const result = await sql`
          INSERT INTO properties (
            account_id, nickname, address, purchase_price, purchase_date,
            closing_costs, renovation_costs, initial_renovations, current_market_value,
            year_built, property_type, size, unit_config, property_data
          )
          VALUES (
            ${prop.accountId},
            ${prop.nickname || null},
            ${prop.address || null},
            ${prop.purchasePrice || null},
            ${prop.purchaseDate || null},
            ${prop.closingCosts || 0},
            ${prop.renovationCosts || 0},
            ${prop.initialRenovations || 0},
            ${prop.currentMarketValue || null},
            ${prop.yearBuilt || null},
            ${prop.propertyType || null},
            ${prop.size || null},
            ${prop.unitConfig || null},
            ${prop.propertyData ? JSON.stringify(prop.propertyData) : null}::jsonb
          )
          RETURNING id, account_id, nickname, address, purchase_price, purchase_date,
                     closing_costs, renovation_costs, initial_renovations, current_market_value,
                     year_built, property_type, size, unit_config, property_data,
                     created_at, updated_at
        ` as Property[];

        if (result[0]) {
          createdProperties.push(result[0]);
        }
      } catch (error) {
        failedProperties.push({
          index: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json(
      createSuccessResponse({
        created: createdProperties.length,
        failed: failedProperties.length,
        total: properties.length,
        errors: errors.length > 0 ? errors : undefined,
        failedProperties: failedProperties.length > 0 ? failedProperties : undefined,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error bulk uploading properties:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

/**
 * Helper function to format dates to YYYY-MM-DD
 */
function formatDate(dateStr: string): string | undefined {
  if (!dateStr || dateStr.trim() === '') return undefined;

  // Try to parse various date formats
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return undefined;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

