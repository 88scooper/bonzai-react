import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { sql } from '@/lib/db';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils.js';

export const runtime = 'nodejs';

/**
 * GET /api/reports/annual-summary
 * Get annual summary of income and expenses for all properties in an account
 * Query params: year (default: current year), accountId (required)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json(
      createErrorResponse('Authentication required', 401),
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        createErrorResponse('Account ID is required', 400),
        { status: 400 }
      );
    }

    // Verify account ownership
    const accountCheck = await sql`
      SELECT id FROM accounts
      WHERE id = ${accountId} AND (user_id = ${user.id} OR is_demo = true)
      LIMIT 1
    ` as Array<{ id: string }>;

    if (!accountCheck[0]) {
      return NextResponse.json(
        createErrorResponse('Account not found', 404),
        { status: 404 }
      );
    }

    // Get all properties for this account
    const properties = await sql`
      SELECT 
        p.id,
        p.nickname,
        p.address,
        p.property_data
      FROM properties p
      WHERE p.account_id = ${accountId}
      ORDER BY p.nickname, p.address
    ` as Array<{
      id: string;
      nickname: string | null;
      address: string | null;
      property_data: any;
    }>;

    if (properties.length === 0) {
      return NextResponse.json(
        createSuccessResponse({
          year,
          properties: [],
          generatedAt: new Date().toISOString(),
          warning: 'No properties found for this account',
        }),
        { status: 200 }
      );
    }

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    // Aggregate data for each property
    const propertyData = await Promise.all(
      properties.map(async (property) => {
        // Get actual expenses for this property in this year
        const expenses = await sql`
          SELECT 
            category,
            SUM(amount) as total_amount
          FROM expenses
          WHERE property_id = ${property.id}
            AND date >= ${yearStart}::date
            AND date <= ${yearEnd}::date
          GROUP BY category
        ` as Array<{ category: string | null; total_amount: number }>;

        // Get property financial data from property_data JSONB
        const propertyData = property.property_data || {};
        const rent = propertyData.rent || {};
        const monthlyRent = rent.monthlyRent || 0;
        const monthlyExpenses = propertyData.monthlyExpenses || {};
        const mortgage = propertyData.mortgage || {};
        
        // Calculate annual rent (use actual rent entries if available, otherwise monthly * 12)
        const rentExpenses = expenses.find(e => 
          e.category === 'Rent' || e.category === 'Income'
        );
        const annualRent = rentExpenses 
          ? Number(rentExpenses.total_amount)
          : monthlyRent * 12;

        // Aggregate expenses by category
        const expenseTotals: Record<string, number> = {};
        expenses.forEach(exp => {
          if (exp.category && exp.category !== 'Rent' && exp.category !== 'Income') {
            const categoryName = exp.category;
            expenseTotals[categoryName] = (expenseTotals[categoryName] || 0) + Number(exp.total_amount);
          }
        });

        // Add calculated expenses from property_data if no actual entries exist
        // Map to CRA category names
        if (!expenseTotals['Property Taxes'] && !expenseTotals['Property Tax'] && monthlyExpenses.propertyTax) {
          expenseTotals['Property Taxes'] = monthlyExpenses.propertyTax * 12;
        }
        if (!expenseTotals['Insurance'] && monthlyExpenses.insurance) {
          expenseTotals['Insurance'] = monthlyExpenses.insurance * 12;
        }
        if (!expenseTotals['Repairs & Maintenance'] && !expenseTotals['Maintenance'] && monthlyExpenses.maintenance) {
          expenseTotals['Repairs & Maintenance'] = monthlyExpenses.maintenance * 12;
        }
        if (!expenseTotals['Condo Maintenance Fees'] && !expenseTotals['Condo Fees'] && monthlyExpenses.condoFees) {
          expenseTotals['Condo Maintenance Fees'] = monthlyExpenses.condoFees * 12;
        }
        if (!expenseTotals['Professional Fees'] && monthlyExpenses.professionalFees) {
          expenseTotals['Professional Fees'] = monthlyExpenses.professionalFees * 12;
        }
        if (!expenseTotals['Utilities'] && monthlyExpenses.utilities) {
          expenseTotals['Utilities'] = monthlyExpenses.utilities * 12;
        }
        if (!expenseTotals['Advertising'] && monthlyExpenses.advertising) {
          expenseTotals['Advertising'] = monthlyExpenses.advertising * 12;
        }
        if (!expenseTotals['Office Expenses'] && monthlyExpenses.officeExpenses) {
          expenseTotals['Office Expenses'] = monthlyExpenses.officeExpenses * 12;
        }
        if (!expenseTotals['Management & Administration'] && !expenseTotals['Management'] && monthlyExpenses.management) {
          expenseTotals['Management & Administration'] = monthlyExpenses.management * 12;
        }
        if (!expenseTotals['Travel'] && monthlyExpenses.travel) {
          expenseTotals['Travel'] = monthlyExpenses.travel * 12;
        }
        if (!expenseTotals['Motor Vehicle Expenses'] && !expenseTotals['Motor Vehicle'] && monthlyExpenses.motorVehicle) {
          expenseTotals['Motor Vehicle Expenses'] = monthlyExpenses.motorVehicle * 12;
        }

        // Calculate mortgage interest (if mortgage exists)
        // Use monthly mortgage interest if available, otherwise calculate from mortgage data
        let mortgageInterest = 0;
        if (monthlyExpenses.mortgageInterest) {
          mortgageInterest = monthlyExpenses.mortgageInterest * 12;
        } else if (mortgage.originalAmount && mortgage.interestRate) {
          // Fallback: estimate annual interest (simplified calculation)
          const monthlyPayment = monthlyExpenses.mortgagePayment || 0;
          const principalPaid = monthlyExpenses.mortgagePrincipal || 0;
          if (monthlyPayment > 0) {
            mortgageInterest = (monthlyPayment - principalPaid) * 12;
          }
        }

        // Add mortgage interest to Interest & Bank Charges
        if (mortgageInterest > 0) {
          expenseTotals['Interest & Bank Charges'] = 
            (expenseTotals['Interest & Bank Charges'] || 0) + mortgageInterest;
        }

        // Add mortgage principal (not deductible, but shown for completeness)
        if (monthlyExpenses.mortgagePrincipal) {
          expenseTotals['Mortgage (Principal)'] = monthlyExpenses.mortgagePrincipal * 12;
        }

        return {
          id: property.id,
          name: property.nickname || property.address || 'Unnamed Property',
          annualRent,
          expenses: expenseTotals,
          hasActualData: expenses.length > 0, // Flag to indicate if we have actual transaction data
        };
      })
    );

    // Check if any property has actual data
    const hasAnyActualData = propertyData.some(p => p.hasActualData);

    return NextResponse.json(
      createSuccessResponse({
        year,
        properties: propertyData,
        generatedAt: new Date().toISOString(),
        hasActualData: hasAnyActualData,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error generating annual summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      createErrorResponse(`Failed to generate annual summary: ${errorMessage}`, 500),
      { status: 500 }
    );
  }
}
