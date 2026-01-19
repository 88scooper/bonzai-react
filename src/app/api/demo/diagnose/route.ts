import { NextRequest, NextResponse } from "next/server";
import { sql } from '@/lib/db';

/**
 * GET /api/demo/diagnose
 * Diagnostic endpoint to check demo account status
 * Helps identify why demo data isn't showing on Vercel
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      postgresUrlPrefix: process.env.POSTGRES_URL ? process.env.POSTGRES_URL.substring(0, 30) + '...' : 'not set',
      demoAccounts: [],
      demoAccountProperties: {},
      errors: []
    };

    // Check database connection
    try {
      await sql`SELECT 1 as test`;
      diagnostics.databaseConnection = 'connected';
    } catch (dbError) {
      diagnostics.databaseConnection = 'failed';
      diagnostics.errors.push(`Database connection failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      return NextResponse.json(diagnostics, { status: 500 });
    }

    // Find all demo accounts
    try {
      const allDemoAccounts = await sql`
        SELECT id, name, email, is_demo, created_at, updated_at
        FROM accounts
        WHERE is_demo = true
        ORDER BY created_at DESC
      `;
      
      diagnostics.demoAccounts = allDemoAccounts.map((acc: any) => ({
        id: acc.id,
        name: acc.name,
        email: acc.email,
        is_demo: acc.is_demo,
        created_at: acc.created_at
      }));

      // For each demo account, count properties
      for (const account of allDemoAccounts) {
        const propertiesCount = await sql`
          SELECT COUNT(*) as count
          FROM properties
          WHERE account_id = ${account.id}
        `;
        
        const mortgagesCount = await sql`
          SELECT COUNT(*) as count
          FROM mortgages m
          INNER JOIN properties p ON m.property_id = p.id
          WHERE p.account_id = ${account.id}
        `;
        
        const expensesCount = await sql`
          SELECT COUNT(*) as count
          FROM expenses e
          INNER JOIN properties p ON e.property_id = p.id
          WHERE p.account_id = ${account.id}
        `;

        diagnostics.demoAccountProperties[account.id] = {
          accountName: account.name,
          accountEmail: account.email,
          propertiesCount: Number(propertiesCount[0]?.count || 0),
          mortgagesCount: Number(mortgagesCount[0]?.count || 0),
          expensesCount: Number(expensesCount[0]?.count || 0),
        };

        // Get property details for the first demo account (the one that should be used)
        if (account.email && account.email.toLowerCase().includes('demo@bonzai')) {
          const properties = await sql`
            SELECT id, nickname, address, account_id
            FROM properties
            WHERE account_id = ${account.id}
            ORDER BY created_at DESC
            LIMIT 10
          `;
          
          diagnostics.demoAccountProperties[account.id].propertyDetails = properties.map((p: any) => ({
            id: p.id,
            nickname: p.nickname,
            address: p.address
          }));
        }
      }

      // Check which account would be selected by the demo API
      const selectedAccount = await sql`
        SELECT id, name, email, is_demo
        FROM accounts
        WHERE is_demo = true
        ORDER BY CASE 
          WHEN LOWER(email) = 'demo@bonzai.io' THEN 1
          WHEN LOWER(email) LIKE '%demo%@bonzai%' THEN 2
          ELSE 3
        END
        LIMIT 1
      `;

      if (selectedAccount.length > 0) {
        diagnostics.selectedDemoAccount = {
          id: selectedAccount[0].id,
          name: selectedAccount[0].name,
          email: selectedAccount[0].email
        };
      } else {
        diagnostics.selectedDemoAccount = null;
        diagnostics.errors.push('No demo account found that would be selected by the demo API');
      }

    } catch (queryError) {
      diagnostics.errors.push(`Query error: ${queryError instanceof Error ? queryError.message : 'Unknown error'}`);
    }

    return NextResponse.json(diagnostics, { status: 200 });
  } catch (error) {
    console.error("[Demo Diagnose] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
