import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { updatePropertySchema } from '@/lib/validations/property.schema';
import { sql } from '@/lib/db';
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
 * Helper function to verify property ownership
 */
async function verifyPropertyOwnership(propertyId: string, userId: string): Promise<boolean> {
  const result = await sql<Array<{ id: string }>>`
    SELECT p.id
    FROM properties p
    INNER JOIN accounts a ON p.account_id = a.id
    WHERE p.id = ${propertyId} AND a.user_id = ${userId}
    LIMIT 1
  `;
  return !!result[0];
}

/**
 * GET /api/properties/[id]
 * Get a specific property by ID
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
    const { id } = await params;

    // Get property and verify ownership
    const result = await sql<Property[]>`
      SELECT p.id, p.account_id, p.nickname, p.address, p.purchase_price, p.purchase_date,
             p.closing_costs, p.renovation_costs, p.initial_renovations, p.current_market_value,
             p.year_built, p.property_type, p.size, p.unit_config, p.property_data,
             p.created_at, p.updated_at
      FROM properties p
      INNER JOIN accounts a ON p.account_id = a.id
      WHERE p.id = ${id} AND a.user_id = ${user.id}
      LIMIT 1
    `;

    if (!result[0]) {
      return NextResponse.json(
        createErrorResponse('Property not found', 404),
        { status: 404 }
      );
    }

    return NextResponse.json(
      createSuccessResponse(result[0]),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching property:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/properties/[id]
 * Update a property
 */
export async function PATCH(
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
    const { id } = await params;

    // Verify ownership
    const ownsProperty = await verifyPropertyOwnership(id, user.id);
    if (!ownsProperty) {
      return NextResponse.json(
        createErrorResponse('Property not found', 404),
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate request body
    const validationResult = updatePropertySchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      return NextResponse.json(
        createErrorResponse(`Validation failed: ${errorMessages}`, 400),
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Build dynamic UPDATE query - this is simplified, in production you'd want a more robust solution
    // For now, we'll update all fields that are provided
    const result = await sql<Property[]>`
      UPDATE properties
      SET 
        nickname = COALESCE(${updateData.nickname || null}, nickname),
        address = COALESCE(${updateData.address || null}, address),
        purchase_price = COALESCE(${updateData.purchasePrice || null}, purchase_price),
        purchase_date = COALESCE(${updateData.purchaseDate || null}, purchase_date),
        closing_costs = COALESCE(${updateData.closingCosts ?? null}, closing_costs),
        renovation_costs = COALESCE(${updateData.renovationCosts ?? null}, renovation_costs),
        initial_renovations = COALESCE(${updateData.initialRenovations ?? null}, initial_renovations),
        current_market_value = COALESCE(${updateData.currentMarketValue || null}, current_market_value),
        year_built = COALESCE(${updateData.yearBuilt || null}, year_built),
        property_type = COALESCE(${updateData.propertyType || null}, property_type),
        size = COALESCE(${updateData.size || null}, size),
        unit_config = COALESCE(${updateData.unitConfig || null}, unit_config),
        property_data = COALESCE(${updateData.propertyData ? JSON.stringify(updateData.propertyData) : null}::jsonb, property_data)
      WHERE id = ${id}
      RETURNING id, account_id, nickname, address, purchase_price, purchase_date,
                 closing_costs, renovation_costs, initial_renovations, current_market_value,
                 year_built, property_type, size, unit_config, property_data,
                 created_at, updated_at
    `;

    if (!result[0]) {
      return NextResponse.json(
        createErrorResponse('Failed to update property', 500),
        { status: 500 }
      );
    }

    return NextResponse.json(
      createSuccessResponse(result[0]),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating property:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/properties/[id]
 * Delete a property
 */
export async function DELETE(
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
    const { id } = await params;

    // Verify ownership
    const ownsProperty = await verifyPropertyOwnership(id, user.id);
    if (!ownsProperty) {
      return NextResponse.json(
        createErrorResponse('Property not found', 404),
        { status: 404 }
      );
    }

    // Delete property (CASCADE will delete related mortgages and expenses)
    await sql`
      DELETE FROM properties
      WHERE id = ${id}
    `;

    return NextResponse.json(
      createSuccessResponse({ message: 'Property deleted successfully' }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting property:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

