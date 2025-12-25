import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { sql } from '@/lib/db';
import { properties } from '@/data/properties';
import { scProperties } from '@/data/scProperties';
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        createErrorResponse('Authentication required', 401),
        { status: 401 }
      );
    }

    // Get accounts
    const accountsResult = await sql`
      SELECT id, name, is_demo FROM accounts WHERE user_id = ${user.id}
    ` as Array<{ id: string; name: string; is_demo: boolean }>;

    const demoAccount = accountsResult.find(a => a.name === 'Demo Account' || a.is_demo);
    const scAccount = accountsResult.find(a => a.name === 'SC Properties');

    if (!demoAccount) {
      return NextResponse.json(
        createErrorResponse('Demo Account not found. Please create it first.', 404),
        { status: 404 }
      );
    }

    if (!scAccount) {
      return NextResponse.json(
        createErrorResponse('SC Properties account not found. Please create it first.', 404),
        { status: 404 }
      );
    }

    const results = {
      demo: { properties: 0, mortgages: 0, expenses: 0, errors: [] as string[] },
      scProperties: { properties: 0, mortgages: 0, expenses: 0, errors: [] as string[] },
    };

    // Import Demo Properties
    const demoPropertyIds = ['first-st-1', 'second-dr-1', 'third-ave-1'];
    const demoProperties = properties.filter(p => demoPropertyIds.includes(p.id));

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

    // Import SC Properties
    const scPropertyIds = ['richmond-st-e-403', 'tretti-way-317', 'wilson-ave-415'];
    const scProps = scProperties.filter(p => scPropertyIds.includes(p.id));

    for (const property of scProps) {
      try {
        const propertyData = mapPropertyToDb(property, scAccount.id);
        
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
          results.scProperties.properties++;
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
                results.scProperties.mortgages++;
              }
            } catch (error: any) {
              results.scProperties.errors.push(`Mortgage for ${property.nickname}: ${error.message}`);
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
                results.scProperties.expenses++;
              } catch (error: any) {
                results.scProperties.errors.push(`Expense for ${property.nickname}: ${error.message}`);
              }
            }
          }
        }
      } catch (error: any) {
        results.scProperties.errors.push(`Property ${property.nickname}: ${error.message}`);
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
}

