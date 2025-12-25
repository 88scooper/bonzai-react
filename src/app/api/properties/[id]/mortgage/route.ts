import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createMortgageSchema, updateMortgageSchema } from '@/lib/validations/mortgage.schema';
import { sql } from '@/lib/db';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

interface Mortgage {
  id: string;
  property_id: string;
  lender: string | null;
  original_amount: number | null;
  interest_rate: number | null;
  rate_type: string | null;
  term_months: number | null;
  amortization_years: number | null;
  payment_frequency: string | null;
  start_date: string | null;
  mortgage_data: any;
  created_at: Date;
  updated_at: Date;
}

/**
 * Helper function to verify property ownership
 */
async function verifyPropertyOwnership(propertyId: string, userId: string): Promise<boolean> {
  const result = await sql`
    SELECT p.id
    FROM properties p
    INNER JOIN accounts a ON p.account_id = a.id
    WHERE p.id = ${propertyId} AND a.user_id = ${userId}
    LIMIT 1
  ` as Array<{ id: string }>;
  return !!result[0];
}

/**
 * GET /api/properties/[id]/mortgage
 * Get mortgage for a property
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json(
      createErrorResponse('Authentication required', 401),
      { status: 401 }
    );
  }

  try {
    const { id: propertyId } = await params;

    // Verify property ownership
    const ownsProperty = await verifyPropertyOwnership(propertyId, user.id);
    if (!ownsProperty) {
      return NextResponse.json(
        createErrorResponse('Property not found', 404),
        { status: 404 }
      );
    }

    // Get mortgage
    const result = await sql`
      SELECT id, property_id, lender, original_amount, interest_rate, rate_type,
             term_months, amortization_years, payment_frequency, start_date,
             mortgage_data, created_at, updated_at
      FROM mortgages
      WHERE property_id = ${propertyId}
      LIMIT 1
    ` as Mortgage[];

    if (!result[0]) {
      return NextResponse.json(
        createErrorResponse('Mortgage not found', 404),
        { status: 404 }
      );
    }

    return NextResponse.json(
      createSuccessResponse(result[0]),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching mortgage:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

/**
 * POST /api/properties/[id]/mortgage
 * Create or update mortgage for a property
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json(
      createErrorResponse('Authentication required', 401),
      { status: 401 }
    );
  }

  try {
    const { id: propertyId } = await params;

    // Verify property ownership
    const ownsProperty = await verifyPropertyOwnership(propertyId, user.id);
    if (!ownsProperty) {
      return NextResponse.json(
        createErrorResponse('Property not found', 404),
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate request body
    const validationResult = createMortgageSchema.safeParse({ ...body, propertyId });
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      return NextResponse.json(
        createErrorResponse(`Validation failed: ${errorMessages}`, 400),
        { status: 400 }
      );
    }

    const {
      lender,
      originalAmount,
      interestRate,
      rateType,
      termMonths,
      amortizationYears,
      paymentFrequency,
      startDate,
      mortgageData,
    } = validationResult.data;

    // Check if mortgage already exists
    const existing = await sql`
      SELECT id FROM mortgages
      WHERE property_id = ${propertyId}
      LIMIT 1
    ` as Array<{ id: string }>;

    let result: Mortgage[];

    if (existing[0]) {
      // Update existing mortgage
      result = await sql`
        UPDATE mortgages
        SET 
          lender = COALESCE(${lender || null}, lender),
          original_amount = COALESCE(${originalAmount || null}, original_amount),
          interest_rate = COALESCE(${interestRate || null}, interest_rate),
          rate_type = COALESCE(${rateType || null}, rate_type),
          term_months = COALESCE(${termMonths || null}, term_months),
          amortization_years = COALESCE(${amortizationYears || null}, amortization_years),
          payment_frequency = COALESCE(${paymentFrequency || null}, payment_frequency),
          start_date = COALESCE(${startDate || null}, start_date),
          mortgage_data = COALESCE(${mortgageData ? JSON.stringify(mortgageData) : null}::jsonb, mortgage_data)
        WHERE property_id = ${propertyId}
        RETURNING id, property_id, lender, original_amount, interest_rate, rate_type,
                   term_months, amortization_years, payment_frequency, start_date,
                   mortgage_data, created_at, updated_at
      ` as Mortgage[];
    } else {
      // Create new mortgage
      result = await sql`
        INSERT INTO mortgages (
          property_id, lender, original_amount, interest_rate, rate_type,
          term_months, amortization_years, payment_frequency, start_date, mortgage_data
        )
        VALUES (
          ${propertyId},
          ${lender || null},
          ${originalAmount || null},
          ${interestRate || null},
          ${rateType || null},
          ${termMonths || null},
          ${amortizationYears || null},
          ${paymentFrequency || null},
          ${startDate || null},
          ${mortgageData ? JSON.stringify(mortgageData) : null}::jsonb
        )
        RETURNING id, property_id, lender, original_amount, interest_rate, rate_type,
                   term_months, amortization_years, payment_frequency, start_date,
                   mortgage_data, created_at, updated_at
      `;
    }

    if (!result[0]) {
      return NextResponse.json(
        createErrorResponse('Failed to save mortgage', 500),
        { status: 500 }
      );
    }

    return NextResponse.json(
      createSuccessResponse(result[0], existing[0] ? 200 : 201),
      { status: existing[0] ? 200 : 201 }
    );
  } catch (error) {
    console.error('Error saving mortgage:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

