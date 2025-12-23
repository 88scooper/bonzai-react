import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createPropertySchema } from '@/lib/validations/property.schema';
import { sql } from '@/lib/db';
import { parsePaginationParams, createPaginatedResponse, getOffset } from '@/lib/pagination';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

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
      // Verify account belongs to user
      const accountCheck = await sql<Array<{ id: string }>>`
        SELECT id FROM accounts
        WHERE id = ${accountId} AND user_id = ${user.id}
        LIMIT 1
      `;

      if (!accountCheck[0]) {
        return NextResponse.json(
          createErrorResponse('Account not found', 404),
          { status: 404 }
        );
      }

      countQuery = sql<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM properties
        WHERE account_id = ${accountId}
      `;

      dataQuery = sql<Property[]>`
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
      countQuery = sql<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM properties p
        INNER JOIN accounts a ON p.account_id = a.id
        WHERE a.user_id = ${user.id}
      `;

      dataQuery = sql<Property[]>`
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

    const countResult = await countQuery;
    const total = Number(countResult[0]?.count || 0);

    const properties = await dataQuery;

    const paginatedResponse = createPaginatedResponse(properties, total, page, limit);

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

    // Validate request body
    const validationResult = createPropertySchema.safeParse(body);
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
    const accountCheck = await sql<Array<{ id: string }>>`
      SELECT id FROM accounts
      WHERE id = ${accountId} AND user_id = ${user.id}
      LIMIT 1
    `;

    if (!accountCheck[0]) {
      return NextResponse.json(
        createErrorResponse('Account not found', 404),
        { status: 404 }
      );
    }

    // Create property
    const result = await sql<Property[]>`
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

