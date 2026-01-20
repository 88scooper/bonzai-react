import { NextRequest, NextResponse } from "next/server";
import { sql } from '@/lib/db';
import { properties } from '@/data/properties';

/**
 * GET /api/demo
 * Public endpoint to get demo account data (read-only)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Log database connection status (for debugging)
    const hasDbConnection = !!process.env.POSTGRES_URL;
    console.log('[Demo API] Database connection:', hasDbConnection ? 'configured' : 'missing POSTGRES_URL');
    
    // Find demo@bonzai.io user first
    const demoUserResult = await sql`
      SELECT id, email FROM users
      WHERE LOWER(email) = 'demo@bonzai.io'
      LIMIT 1
    ` as Array<{ id: string; email: string }>;

    if (!demoUserResult[0]) {
      return NextResponse.json(
        { success: false, error: "Demo user (demo@bonzai.io) not found" },
        { status: 404 }
      );
    }

    const demoUser = demoUserResult[0];

    // Find demo account - ensure it belongs to demo@bonzai.io user
    const demoAccountResultRaw = await sql`
      SELECT id, name, email, is_demo, user_id, created_at, updated_at
      FROM accounts
      WHERE is_demo = true AND user_id = ${demoUser.id}
      ORDER BY CASE 
        WHEN LOWER(email) = 'demo@bonzai.io' THEN 1
        ELSE 2
      END
      LIMIT 1
    `;
    
    console.log('[Demo API] Found demo accounts:', demoAccountResultRaw.length);
    let demoAccountResult = demoAccountResultRaw as Array<{
      id: string;
      name: string;
      email: string | null;
      is_demo: boolean;
      user_id: string;
      created_at: Date;
      updated_at: Date;
    }>;

    // Create demo account if it doesn't exist for demo@bonzai.io user
    if (!demoAccountResult[0]) {
      console.log('[Demo API] Creating demo account for demo@bonzai.io user...');
      const createResult = await sql`
        INSERT INTO accounts (user_id, name, email, is_demo)
        VALUES (${demoUser.id}, 'Demo Account', 'demo@bonzai.io', true)
        RETURNING id, name, email, is_demo, user_id, created_at, updated_at
      ` as Array<{
        id: string;
        name: string;
        email: string | null;
        is_demo: boolean;
        user_id: string;
        created_at: Date;
        updated_at: Date;
      }>;
      
      if (!createResult[0]) {
        return NextResponse.json(
          { success: false, error: "Failed to create demo account" },
          { status: 500 }
        );
      }
      
      demoAccountResult = createResult;
      console.log('[Demo API] Created demo account:', demoAccountResult[0].id);
    }

    const demoAccount = demoAccountResult[0];
    console.log('[Demo API] Using demo account:', {
      id: demoAccount.id,
      name: demoAccount.name,
      email: demoAccount.email
    });

    // Get properties for demo account
    let propertiesResultRaw = await sql`
      SELECT id, account_id, nickname, address, purchase_price, purchase_date,
             closing_costs, renovation_costs, initial_renovations, current_market_value,
             year_built, property_type, size, unit_config, property_data,
             created_at, updated_at
      FROM properties
      WHERE account_id = ${demoAccount.id}
      ORDER BY created_at DESC
    `;
    let propertiesResult = propertiesResultRaw as Array<any>;
    console.log('[Demo API] Found properties:', propertiesResult.length);

    // Auto-seed demo properties if they don't exist
    if (propertiesResult.length === 0) {
      console.log('[Demo API] No properties found, seeding demo properties...');
      
      const demoPropertyIds = ['first-st-1', 'second-dr-1', 'third-ave-1'];
      const demoProperties = properties.filter(p => demoPropertyIds.includes(p.id));
      
      for (const property of demoProperties) {
        try {
          // Map property to database format
          const propertyData = {
            account_id: demoAccount.id,
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
            property_data: JSON.stringify({
              units: property.units || 1,
              rent: property.rent || null,
              tenants: property.tenants || [],
              originalId: property.id,
            })
          };
          
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
              ${propertyData.unit_config}, ${propertyData.property_data}::jsonb
            )
            RETURNING id
          ` as Array<{ id: string }>;

          if (propertyResult.length > 0) {
            const propertyId = propertyResult[0].id;

            // Create mortgage if exists
            if (property.mortgage) {
              try {
                const mortgageData = {
                  lender: property.mortgage.lender || property.mortgage.lenderName || '',
                  original_amount: property.mortgage.originalAmount || property.mortgage.principal || 0,
                  interest_rate: property.mortgage.interestRate || property.mortgage.rate || 0,
                  rate_type: property.mortgage.rateType || 'Fixed',
                  term_months: property.mortgage.termMonths || (property.mortgage.termYears ? property.mortgage.termYears * 12 : 60),
                  amortization_years: property.mortgage.amortizationYears || property.mortgage.amortizationPeriodYears || 25,
                  payment_frequency: property.mortgage.paymentFrequency || 'Monthly',
                  start_date: property.mortgage.startDate || null,
                  mortgage_data: JSON.stringify({
                    mortgageNumber: property.mortgage.mortgageNumber || null,
                    currentBalance: property.mortgage.currentBalance || null,
                    paymentAmount: property.mortgage.paymentAmount || null,
                    renewalDate: property.mortgage.renewalDate || null,
                    remainingAmortization: property.mortgage.remainingAmortization || null,
                  })
                };
                
                await sql`
                  INSERT INTO mortgages (
                    property_id, lender, original_amount, interest_rate, rate_type,
                    term_months, amortization_years, payment_frequency, start_date, mortgage_data
                  ) VALUES (
                    ${propertyId}, ${mortgageData.lender}, ${mortgageData.original_amount},
                    ${mortgageData.interest_rate}, ${mortgageData.rate_type},
                    ${mortgageData.term_months}, ${mortgageData.amortization_years},
                    ${mortgageData.payment_frequency}, ${mortgageData.start_date},
                    ${mortgageData.mortgage_data}::jsonb
                  )
                `;
              } catch (error: any) {
                console.error(`[Demo API] Error creating mortgage for ${property.nickname}:`, error.message);
              }
            }

            // Create expenses
            if (property.expenseHistory && Array.isArray(property.expenseHistory)) {
              for (const expense of property.expenseHistory) {
                try {
                  const expenseData = {
                    date: expense.date || new Date().toISOString().split('T')[0],
                    amount: expense.amount || 0,
                    category: expense.category || 'Other',
                    description: expense.description || expense.note || '',
                    expense_data: JSON.stringify({})
                  };
                  
                  await sql`
                    INSERT INTO expenses (property_id, date, amount, category, description, expense_data)
                    VALUES (
                      ${propertyId}, ${expenseData.date}, ${expenseData.amount},
                      ${expenseData.category}, ${expenseData.description},
                      ${expenseData.expense_data}::jsonb
                    )
                  `;
                } catch (error: any) {
                  console.error(`[Demo API] Error creating expense for ${property.nickname}:`, error.message);
                }
              }
            }
          }
        } catch (error: any) {
          console.error(`[Demo API] Error seeding property ${property.nickname}:`, error.message);
        }
      }

      // Re-fetch properties after seeding
      propertiesResultRaw = await sql`
        SELECT id, account_id, nickname, address, purchase_price, purchase_date,
               closing_costs, renovation_costs, initial_renovations, current_market_value,
               year_built, property_type, size, unit_config, property_data,
               created_at, updated_at
        FROM properties
        WHERE account_id = ${demoAccount.id}
        ORDER BY created_at DESC
      `;
      propertiesResult = propertiesResultRaw as Array<any>;
      console.log('[Demo API] Properties after seeding:', propertiesResult.length);
    }

    // Get mortgages for demo account properties
    const propertyIds = propertiesResult.map(p => p.id);
    let mortgagesResult: any[] = [];
    if (propertyIds.length > 0) {
      // For Neon, we need to use a different approach for array queries
      // Build individual queries or use a workaround
      // Since propertyIds is an array of strings, we'll query each property individually
      // and combine results (more efficient than multiple queries would be to use IN with proper formatting)
      const mortgagesPromises = propertyIds.map(propertyId => 
        sql`
          SELECT id, property_id, lender, original_amount, interest_rate, rate_type,
                 term_months, amortization_years, payment_frequency, start_date,
                 mortgage_data, created_at, updated_at
          FROM mortgages
          WHERE property_id = ${propertyId}
        `
      );
      const mortgagesResults = await Promise.all(mortgagesPromises);
      mortgagesResult = mortgagesResults.flat() as Array<any>;
      // Sort by created_at DESC
      mortgagesResult.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // Get expenses for demo account properties
    let expensesResult: any[] = [];
    if (propertyIds.length > 0) {
      // Query expenses for each property and combine
      const expensesPromises = propertyIds.map(propertyId =>
        sql`
          SELECT id, property_id, date, amount, category, description, expense_data,
                 created_at, updated_at
          FROM expenses
          WHERE property_id = ${propertyId}
        `
      );
      const expensesResults = await Promise.all(expensesPromises);
      expensesResult = expensesResults.flat() as Array<any>;
      // Sort by date DESC
      expensesResult.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return NextResponse.json({
      success: true,
      data: {
        account: {
          id: demoAccount.id,
          name: demoAccount.name,
          email: demoAccount.email,
          isDemo: demoAccount.is_demo,
          createdAt: demoAccount.created_at,
          updatedAt: demoAccount.updated_at,
        },
        properties: propertiesResult.map(p => ({
          id: p.id,
          accountId: p.account_id,
          nickname: p.nickname,
          address: p.address,
          purchasePrice: p.purchase_price,
          purchaseDate: p.purchase_date,
          closingCosts: p.closing_costs,
          renovationCosts: p.renovation_costs,
          initialRenovations: p.initial_renovations,
          currentMarketValue: p.current_market_value,
          yearBuilt: p.year_built,
          propertyType: p.property_type,
          size: p.size,
          unitConfig: p.unit_config,
          propertyData: p.property_data,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        })),
        mortgages: mortgagesResult.map(m => ({
          id: m.id,
          propertyId: m.property_id,
          lenderName: m.lender || '',
          originalAmount: m.original_amount,
          currentBalance: m.mortgage_data?.currentBalance || null,
          interestRate: m.interest_rate,
          termMonths: m.term_months,
          startDate: m.start_date,
          paymentFrequency: m.payment_frequency,
          paymentAmount: m.mortgage_data?.paymentAmount || null,
          mortgageData: m.mortgage_data,
          createdAt: m.created_at,
          updatedAt: m.updated_at,
        })),
        expenses: expensesResult.map(e => ({
          id: e.id,
          propertyId: e.property_id,
          amount: e.amount,
          expenseDate: e.date,
          description: e.description,
          category: e.category,
          expenseData: e.expense_data,
          createdAt: e.created_at,
          updatedAt: e.updated_at,
        })),
      },
    });
  } catch (error) {
    console.error("[Demo API] Error fetching demo data:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    // Provide more detailed error information
    const errorDetails: any = {
      success: false,
      error: errorMessage,
    };
    
    // Check if it's a database connection error
    if (errorMessage.includes('POSTGRES_URL') || errorMessage.includes('connection') || errorMessage.includes('database')) {
      errorDetails.hint = 'Database connection issue. Check POSTGRES_URL environment variable.';
      errorDetails.hasPostgresUrl = !!process.env.POSTGRES_URL;
    }
    
    return NextResponse.json(errorDetails, { status: 500 });
  }
}

