import { NextRequest, NextResponse } from "next/server";
import { sql } from '@/lib/db';

/**
 * GET /api/demo
 * Public endpoint to get demo account data (read-only)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Find demo account (is_demo = true)
    const demoAccountResult = await sql`
      SELECT id, name, email, is_demo, created_at, updated_at
      FROM accounts
      WHERE is_demo = true
      LIMIT 1
    ` as Array<{
      id: string;
      name: string;
      email: string | null;
      is_demo: boolean;
      created_at: Date;
      updated_at: Date;
    }>;

    if (!demoAccountResult[0]) {
      return NextResponse.json(
        { success: false, error: "Demo account not found" },
        { status: 404 }
      );
    }

    const demoAccount = demoAccountResult[0];

    // Get properties for demo account
    const propertiesResult = await sql`
      SELECT id, account_id, nickname, address, purchase_price, purchase_date,
             closing_costs, renovation_costs, initial_renovations, current_market_value,
             year_built, property_type, size, unit_config, property_data,
             created_at, updated_at
      FROM properties
      WHERE account_id = ${demoAccount.id}
      ORDER BY created_at DESC
    ` as Array<any>;

    // Get mortgages for demo account properties
    const propertyIds = propertiesResult.map(p => p.id);
    let mortgagesResult: any[] = [];
    if (propertyIds.length > 0) {
      mortgagesResult = await sql`
        SELECT id, property_id, lender_name, original_amount, current_balance,
               interest_rate, term_months, start_date, payment_frequency,
               payment_amount, mortgage_data, created_at, updated_at
        FROM mortgages
        WHERE property_id = ANY(${propertyIds})
        ORDER BY created_at DESC
      ` as Array<any>;
    }

    // Get expenses for demo account properties
    let expensesResult: any[] = [];
    if (propertyIds.length > 0) {
      expensesResult = await sql`
        SELECT id, property_id, expense_type, amount, expense_date, description,
               category, is_recurring, recurring_frequency, created_at, updated_at
        FROM expenses
        WHERE property_id = ANY(${propertyIds})
        ORDER BY expense_date DESC
      ` as Array<any>;
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
          lenderName: m.lender_name,
          originalAmount: m.original_amount,
          currentBalance: m.current_balance,
          interestRate: m.interest_rate,
          termMonths: m.term_months,
          startDate: m.start_date,
          paymentFrequency: m.payment_frequency,
          paymentAmount: m.payment_amount,
          mortgageData: m.mortgage_data,
          createdAt: m.created_at,
          updatedAt: m.updated_at,
        })),
        expenses: expensesResult.map(e => ({
          id: e.id,
          propertyId: e.property_id,
          expenseType: e.expense_type,
          amount: e.amount,
          expenseDate: e.expense_date,
          description: e.description,
          category: e.category,
          isRecurring: e.is_recurring,
          recurringFrequency: e.recurring_frequency,
          createdAt: e.created_at,
          updatedAt: e.updated_at,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching demo data:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

