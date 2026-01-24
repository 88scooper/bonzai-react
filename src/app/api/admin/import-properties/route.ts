import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { sql } from '@/lib/db';
import { properties } from '@/data/properties';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

/**
 * Admin endpoint to import properties from code files to database
 * POST /api/admin/import-properties
 */

// Map property to database format
function mapPropertyToDb(property: any, accountId: string): any {
  return {
    account_id: accountId,
    nickname: property.nickname || property.name || 'Unnamed Property',
    address: property.address || '',
    purchase_price: property.purchasePrice || 0,
    purchase_date: property.purchaseDate || null,
    closing_costs: property.closingCosts || 0,
    renovation_costs: property.renovationCosts || 0,
    initial_renovations: property.initialRenovations || 0,
    current_market_value: property.currentMarketValue || property.currentValue || 0,
    year_built: property.yearBuilt || null,
    property_type: property.propertyType || property.type || null,
    size: property.size || property.squareFootage || null,
    unit_config: property.unitConfig || null,
    property_data: {
      units: property.units || 1,
      rent: property.rent || null,
      tenants: property.tenants || [],
      originalId: property.id,
    }
  };
}

// Map mortgage to database format
function mapMortgageToDb(mortgage: any): any {
  if (!mortgage) return null;
  
  return {
    lender: mortgage.lender || mortgage.lenderName || '',
    original_amount: mortgage.originalAmount || mortgage.principal || 0,
    interest_rate: mortgage.interestRate || mortgage.rate || 0,
    rate_type: mortgage.rateType || 'Fixed',
    term_months: mortgage.termMonths || (mortgage.termYears ? mortgage.termYears * 12 : 60),
    amortization_years: mortgage.amortizationYears || mortgage.amortizationPeriodYears || 25,
    payment_frequency: mortgage.paymentFrequency || 'Monthly',
    start_date: mortgage.startDate || null,
    mortgage_data: {
      mortgageNumber: mortgage.mortgageNumber || null,
      currentBalance: mortgage.currentBalance || null,
      paymentAmount: mortgage.paymentAmount || null,
      renewalDate: mortgage.renewalDate || null,
      remainingAmortization: mortgage.remainingAmortization || null,
    }
  };
}

// Map expense to database format
function mapExpenseToDb(expense: any): any {
  return {
    date: expense.date || new Date().toISOString().split('T')[0],
    amount: expense.amount || 0,
    category: expense.category || 'Other',
    description: expense.description || expense.note || '',
    expense_data: {}
  };
}

export const POST = withAdminAuth(async (request: NextRequest): Promise<NextResponse> => {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      createErrorResponse('Not found', 404),
      { status: 404 }
    );
  }

  try {

    // Find demo@bonzai.io user first
    const demoUserResult = await sql`
      SELECT id, email FROM users
      WHERE LOWER(email) = 'demo@bonzai.io'
      LIMIT 1
    ` as Array<{ id: string; email: string }>;

    if (!demoUserResult[0]) {
      return NextResponse.json(
        createErrorResponse('Demo user (demo@bonzai.io) not found. Please create the demo user first.', 404),
        { status: 404 }
      );
    }

    const demoUser = demoUserResult[0];

    // Get demo account - ensure it belongs to demo@bonzai.io user
    const demoAccountResult = await sql`
      SELECT id, name, email, is_demo, user_id FROM accounts
      WHERE is_demo = true AND user_id = ${demoUser.id}
      ORDER BY CASE 
        WHEN LOWER(email) = 'demo@bonzai.io' THEN 1
        ELSE 2
      END
      LIMIT 1
    ` as Array<{ id: string; name: string; email: string | null; is_demo: boolean; user_id: string }>;

    let demoAccount = demoAccountResult[0];

    // Create demo account if it doesn't exist for demo@bonzai.io user
    if (!demoAccount) {
      console.log(`[Import] Creating demo account for demo@bonzai.io user...`);
      const createResult = await sql`
        INSERT INTO accounts (user_id, name, email, is_demo)
        VALUES (${demoUser.id}, 'Demo Account', 'demo@bonzai.io', true)
        RETURNING id, name, email, is_demo, user_id
      ` as Array<{ id: string; name: string; email: string | null; is_demo: boolean; user_id: string }>;
      
      if (!createResult[0]) {
        return NextResponse.json(
          createErrorResponse('Failed to create demo account', 500),
          { status: 500 }
        );
      }
      
      demoAccount = createResult[0];
      console.log(`[Import] Created demo account: ${demoAccount.id} for user ${demoUser.id}`);
    } else {
      console.log(`[Import] Found demo account: ${demoAccount.id} for user ${demoUser.id}`);
    }

    const results = {
      demo: { properties: 0, mortgages: 0, expenses: 0, errors: [] as string[], deleted: 0 },
    };

    // Delete existing properties for demo account (to avoid duplicates)
    // This will cascade delete mortgages and expenses
    try {
      const deleteResult = await sql`
        DELETE FROM properties WHERE account_id = ${demoAccount.id}
      `;
      console.log(`[Import] Deleted existing properties for demo account: ${demoAccount.id}`);
      // Note: PostgreSQL doesn't return count from DELETE, but we'll log success
    } catch (error: any) {
      results.demo.errors.push(`Failed to delete existing properties: ${error.message}`);
    }

    // Import Demo Properties
    const demoPropertyIds = ['first-st-1', 'second-dr-1', 'third-ave-1'];
    const demoProperties = properties.filter(p => demoPropertyIds.includes(p.id));
    
    console.log(`[Import] Importing ${demoProperties.length} properties to demo account: ${demoAccount.id}`);

    for (const property of demoProperties) {
      try {
        const propertyData = mapPropertyToDb(property, demoAccount.id);
        
        const propertyResult = await sql`
          INSERT INTO properties (
            account_id, nickname, address, purchase_price, purchase_date,
            closing_costs, renovation_costs, initial_renovations,
            current_market_value, year_built, property_type, size, unit_config, property_data
          ) VALUES (
            ${propertyData.account_id}, ${propertyData.nickname}, ${propertyData.address},
            ${propertyData.purchase_price}, ${propertyData.purchase_date},
            ${propertyData.closing_costs}, ${propertyData.renovation_costs},
            ${propertyData.initial_renovations}, ${propertyData.current_market_value},
            ${propertyData.year_built}, ${propertyData.property_type}, ${propertyData.size},
            ${propertyData.unit_config}, ${JSON.stringify(propertyData.property_data)}
          )
          RETURNING id
        ` as Array<{ id: string }>;

        if (propertyResult.length > 0) {
          results.demo.properties++;
          const propertyId = propertyResult[0].id;

          // Create mortgage
          if (property.mortgage) {
            try {
              const mortgageData = mapMortgageToDb(property.mortgage);
              if (mortgageData) {
                await sql`
                  INSERT INTO mortgages (
                    property_id, lender, original_amount, interest_rate, rate_type,
                    term_months, amortization_years, payment_frequency, start_date, mortgage_data
                  ) VALUES (
                    ${propertyId}, ${mortgageData.lender}, ${mortgageData.original_amount},
                    ${mortgageData.interest_rate}, ${mortgageData.rate_type},
                    ${mortgageData.term_months}, ${mortgageData.amortization_years},
                    ${mortgageData.payment_frequency}, ${mortgageData.start_date},
                    ${JSON.stringify(mortgageData.mortgage_data)}
                  )
                `;
                results.demo.mortgages++;
              }
            } catch (error: any) {
              results.demo.errors.push(`Mortgage for ${property.nickname}: ${error.message}`);
            }
          }

          // Create expenses
          if (property.expenseHistory && Array.isArray(property.expenseHistory)) {
            for (const expense of property.expenseHistory) {
              try {
                const expenseData = mapExpenseToDb(expense);
                await sql`
                  INSERT INTO expenses (property_id, date, amount, category, description, expense_data)
                  VALUES (
                    ${propertyId}, ${expenseData.date}, ${expenseData.amount},
                    ${expenseData.category}, ${expenseData.description},
                    ${JSON.stringify(expenseData.expense_data)}
                  )
                `;
                results.demo.expenses++;
              } catch (error: any) {
                results.demo.errors.push(`Expense for ${property.nickname}: ${error.message}`);
              }
            }
          }
        }
      } catch (error: any) {
        results.demo.errors.push(`Property ${property.nickname}: ${error.message}`);
      }
    }


    return NextResponse.json(
      createSuccessResponse({
        message: 'Properties imported successfully',
        results,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error importing properties:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
});

