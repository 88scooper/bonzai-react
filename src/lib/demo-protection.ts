import { sql } from '@/lib/db';
import { createErrorResponse } from './api-utils';
import { NextResponse } from 'next/server';

/**
 * Check if an account is a demo account
 * @param accountId - The account ID to check
 * @returns Promise<boolean> - True if the account is a demo account
 */
export async function isDemoAccount(accountId: string): Promise<boolean> {
  const resultRaw = await sql`
    SELECT is_demo FROM accounts
    WHERE id = ${accountId}
    LIMIT 1
  `;
  const result = resultRaw as Array<{ is_demo: boolean }>;
  
  return result[0]?.is_demo === true;
}

/**
 * Check if a property belongs to a demo account
 * @param propertyId - The property ID to check
 * @returns Promise<boolean> - True if the property belongs to a demo account
 */
export async function isDemoProperty(propertyId: string): Promise<boolean> {
  const resultRaw = await sql`
    SELECT a.is_demo
    FROM properties p
    INNER JOIN accounts a ON p.account_id = a.id
    WHERE p.id = ${propertyId}
    LIMIT 1
  `;
  const result = resultRaw as Array<{ is_demo: boolean }>;
  
  return result[0]?.is_demo === true;
}

/**
 * Prevent modifications to demo accounts/properties
 * Use this helper in write endpoints (POST, PATCH, PUT, DELETE)
 * @param accountIdOrPropertyId - Account ID or Property ID to check
 * @param isPropertyId - If true, treats the ID as a property ID, otherwise as an account ID
 * @returns NextResponse with error if demo account, null if allowed
 */
export async function preventDemoModification(
  accountIdOrPropertyId: string,
  isPropertyId: boolean = false
): Promise<NextResponse | null> {
  const isDemo = isPropertyId
    ? await isDemoProperty(accountIdOrPropertyId)
    : await isDemoAccount(accountIdOrPropertyId);
  
  if (isDemo) {
    return NextResponse.json(
      createErrorResponse('Cannot modify demo account data. Demo accounts are read-only.', 403),
      { status: 403 }
    );
  }
  
  return null;
}
