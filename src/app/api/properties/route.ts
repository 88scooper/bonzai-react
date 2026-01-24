import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createPropertySchema } from '@/lib/validations/property.schema';
import { sql } from '@/lib/db';
import { parsePaginationParams, createPaginatedResponse, getOffset } from '@/lib/pagination';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { preventDemoModification } from '@/lib/demo-protection';
import { validateRequest } from '@/lib/validate-request';
// Demo seed properties used only for auto-seeding demo accounts
// Alias to avoid naming conflicts with DB properties variables below
import { properties as demoSeedProperties } from '@/data/properties';
import { scProperties as scSeedProperties } from '@/data/scProperties';

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
 * GET /api/properties
 * Get all properties (paginated, optionally filtered by accountId)
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
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const { page, limit } = parsePaginationParams(request);
    const offset = getOffset(page, limit);

    // Build query - get properties through accounts that belong to user
    let countQuery;
    let dataQuery;

    if (accountId) {
      // Verify account belongs to user OR is a demo account (demo accounts are publicly readable)
      const accountCheck = await sql`
        SELECT id, is_demo FROM accounts
        WHERE id = ${accountId} AND (user_id = ${user.id} OR is_demo = true)
        LIMIT 1
      ` as Array<{ id: string; is_demo: boolean }>;

      if (!accountCheck[0]) {
        return NextResponse.json(
          createErrorResponse('Account not found', 404),
          { status: 404 }
        );
      }

      const isDemoAccount = accountCheck[0].is_demo;

      // Check if demo account has properties, if not, auto-seed them
      if (isDemoAccount) {
        const existingPropsCount = await sql`
          SELECT COUNT(*) as count
          FROM properties
          WHERE account_id = ${accountId}
        ` as Array<{ count: bigint }>;
        
        const count = Number(existingPropsCount[0]?.count || 0);
        
        if (count === 0) {
          console.log('[Properties API] No properties found for demo account, auto-seeding...');
          
          // Find demo@bonzai.io user to ensure account belongs to correct user
          const demoUserResult = await sql`
            SELECT id FROM users
            WHERE LOWER(email) = 'demo@bonzai.io'
            LIMIT 1
          ` as Array<{ id: string }>;
          
          if (demoUserResult[0]) {
            // Verify account belongs to demo@bonzai.io user
            const demoAccountCheck = await sql`
              SELECT id FROM accounts
              WHERE id = ${accountId} AND user_id = ${demoUserResult[0].id} AND is_demo = true
              LIMIT 1
            ` as Array<{ id: string }>;
            
            if (demoAccountCheck[0]) {
              // Import seeding logic from the demo route
              const demoPropertyIds = ['first-st-1', 'second-dr-1', 'third-ave-1'];
              const demoProperties = demoSeedProperties.filter(p => demoPropertyIds.includes(p.id));
              
              for (const property of demoProperties) {
                try {
                  const propertyData = {
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
                        console.error(`[Properties API] Error creating mortgage for ${property.nickname}:`, error.message);
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
                          console.error(`[Properties API] Error creating expense for ${property.nickname}:`, error.message);
                        }
                      }
                    }
                  }
                } catch (error: any) {
                  console.error(`[Properties API] Error seeding property ${property.nickname}:`, error.message);
                }
              }
              
              console.log('[Properties API] Demo properties seeded successfully');
            }
          }
        }
      }

      // If cooper.stuartc@gmail.com has an empty account, seed SC properties into it
      if (user.email?.toLowerCase() === 'cooper.stuartc@gmail.com' && !isDemoAccount) {
        const existingPropsCount = await sql`
          SELECT COUNT(*) as count
          FROM properties
          WHERE account_id = ${accountId}
        ` as Array<{ count: bigint }>;

        const count = Number(existingPropsCount[0]?.count || 0);

        if (count === 0) {
          console.log('[Properties API] No properties found for cooper account, seeding SC properties...');
          const scPropertyIds = ['richmond-st-e-403', 'tretti-way-317', 'wilson-ave-415'];
          const scProperties = scSeedProperties.filter(p => scPropertyIds.includes(p.id));

          for (const property of scProperties) {
            try {
              const propertyData = {
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
                    console.error(`[Properties API] Error creating mortgage for ${property.nickname}:`, error.message);
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
                      console.error(`[Properties API] Error creating expense for ${property.nickname}:`, error.message);
                    }
                  }
                }
              }
            } catch (error: any) {
              console.error(`[Properties API] Error seeding SC property ${property.nickname}:`, error.message);
            }
          }

          console.log('[Properties API] SC properties seeded successfully for cooper account');
        }
      }

      // Backfill missing mortgage data for cooper.stuartc@gmail.com SC properties
      const isCooperUser = user.email?.toLowerCase() === 'cooper.stuartc@gmail.com';
      if (isCooperUser && !isDemoAccount) {
        const normalize = (value: string | null | undefined) =>
          (value || '').toLowerCase().replace(/\s+/g, ' ').trim();

        const scByOriginalId = new Map(scSeedProperties.map(p => [p.id, p]));
        const scByNickname = new Map(scSeedProperties.map(p => [normalize(p.nickname || p.name), p]));
        const scByAddress = new Map(scSeedProperties.map(p => [normalize(p.address), p]));

        const accountProps = await sql`
          SELECT id, nickname, address, property_data
          FROM properties
          WHERE account_id = ${accountId}
        ` as Array<{ id: string; nickname: string | null; address: string | null; property_data: any }>;

        for (const dbProp of accountProps) {
          const originalId = dbProp.property_data?.originalId;
          const match =
            (originalId && scByOriginalId.get(originalId)) ||
            scByNickname.get(normalize(dbProp.nickname)) ||
            scByAddress.get(normalize(dbProp.address));

          if (!match || !match.mortgage) {
            continue;
          }

          const existingMortgage = await sql`
            SELECT 1 FROM mortgages WHERE property_id = ${dbProp.id} LIMIT 1
          `;
          if (existingMortgage[0]) {
            continue;
          }

          try {
            const mortgageData = {
              lender: match.mortgage.lender || match.mortgage.lenderName || '',
              original_amount: match.mortgage.originalAmount || match.mortgage.principal || 0,
              interest_rate: match.mortgage.interestRate || match.mortgage.rate || 0,
              rate_type: match.mortgage.rateType || 'Fixed',
              term_months: match.mortgage.termMonths || (match.mortgage.termYears ? match.mortgage.termYears * 12 : 60),
              amortization_years: match.mortgage.amortizationYears || match.mortgage.amortizationPeriodYears || 25,
              payment_frequency: match.mortgage.paymentFrequency || 'Monthly',
              start_date: match.mortgage.startDate || null,
              mortgage_data: JSON.stringify({
                mortgageNumber: match.mortgage.mortgageNumber || null,
                currentBalance: match.mortgage.currentBalance || null,
                paymentAmount: match.mortgage.paymentAmount || null,
                renewalDate: match.mortgage.renewalDate || null,
                remainingAmortization: match.mortgage.remainingAmortization || null,
              })
            };

            await sql`
              INSERT INTO mortgages (
                property_id, lender, original_amount, interest_rate, rate_type,
                term_months, amortization_years, payment_frequency, start_date, mortgage_data
              ) VALUES (
                ${dbProp.id}, ${mortgageData.lender}, ${mortgageData.original_amount},
                ${mortgageData.interest_rate}, ${mortgageData.rate_type},
                ${mortgageData.term_months}, ${mortgageData.amortization_years},
                ${mortgageData.payment_frequency}, ${mortgageData.start_date},
                ${mortgageData.mortgage_data}::jsonb
              )
            `;
            console.log('[Properties API] Backfilled mortgage for property:', dbProp.id);
          } catch (error: any) {
            console.error('[Properties API] Error backfilling mortgage:', error.message);
          }
        }
      }


      countQuery = sql`
        SELECT COUNT(*) as count
        FROM properties
        WHERE account_id = ${accountId}
      `;

      dataQuery = sql`
        SELECT id, account_id, nickname, address, purchase_price, purchase_date,
               closing_costs, renovation_costs, initial_renovations, current_market_value,
               year_built, property_type, size, unit_config, property_data,
               created_at, updated_at
        FROM properties
        WHERE account_id = ${accountId}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
    } else {
      // Get all properties for user's accounts
      countQuery = sql`
        SELECT COUNT(*) as count
        FROM properties p
        INNER JOIN accounts a ON p.account_id = a.id
        WHERE a.user_id = ${user.id}
      `;

      dataQuery = sql`
        SELECT p.id, p.account_id, p.nickname, p.address, p.purchase_price, p.purchase_date,
               p.closing_costs, p.renovation_costs, p.initial_renovations, p.current_market_value,
               p.year_built, p.property_type, p.size, p.unit_config, p.property_data,
               p.created_at, p.updated_at
        FROM properties p
        INNER JOIN accounts a ON p.account_id = a.id
        WHERE a.user_id = ${user.id}
        ORDER BY p.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
    }

    const countResult = await countQuery as Array<{ count: bigint }>;
    const total = Number(countResult[0]?.count || 0);

    // Use a different variable name to avoid shadowing the imported `properties` demo data
    const dbProperties = await dataQuery as Property[];
    
    const paginatedResponse = createPaginatedResponse(dbProperties, total, page, limit);

    return NextResponse.json(
      createSuccessResponse(paginatedResponse),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching properties:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

/**
 * POST /api/properties
 * Create a new property
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
    // Parse request body
    const body = await request.json();

    // Validate request body using shared validation utility
    const validationResult = validateRequest(createPropertySchema, body);
    if (validationResult.success === false) {
      return NextResponse.json(
        createErrorResponse(validationResult.error, validationResult.statusCode || 400),
        { status: validationResult.statusCode || 400 }
      );
    }

    // TypeScript now knows validationResult.success === true here
    const {
      accountId,
      nickname,
      address,
      purchasePrice,
      purchaseDate,
      closingCosts,
      renovationCosts,
      initialRenovations,
      currentMarketValue,
      yearBuilt,
      propertyType,
      size,
      unitConfig,
      propertyData,
    } = validationResult.data;

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

    // Prevent modifications to demo accounts
    const demoCheck = await preventDemoModification(accountId, false);
    if (demoCheck) {
      return demoCheck;
    }

    // Create property
    const result = await sql`
      INSERT INTO properties (
        account_id, nickname, address, purchase_price, purchase_date,
        closing_costs, renovation_costs, initial_renovations, current_market_value,
        year_built, property_type, size, unit_config, property_data
      )
      VALUES (
        ${accountId},
        ${nickname || null},
        ${address || null},
        ${purchasePrice || null},
        ${purchaseDate || null},
        ${closingCosts || 0},
        ${renovationCosts || 0},
        ${initialRenovations || 0},
        ${currentMarketValue || null},
        ${yearBuilt || null},
        ${propertyType || null},
        ${size || null},
        ${unitConfig || null},
        ${propertyData ? JSON.stringify(propertyData) : null}::jsonb
      )
      RETURNING id, account_id, nickname, address, purchase_price, purchase_date,
                 closing_costs, renovation_costs, initial_renovations, current_market_value,
                 year_built, property_type, size, unit_config, property_data,
                 created_at, updated_at
    `;

    if (!result[0]) {
      return NextResponse.json(
        createErrorResponse('Failed to create property', 500),
        { status: 500 }
      );
    }

    return NextResponse.json(
      createSuccessResponse(result[0], 201),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating property:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

