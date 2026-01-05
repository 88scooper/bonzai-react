import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { sql } from '@/lib/db';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

interface Event {
  id: string;
  user_id: string;
  date: string;
  time: string | null;
  description: string;
  property: string | null;
  notify: boolean;
  recurrence: any | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * DELETE /api/events/[id]
 * Delete an event
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

    // Verify event belongs to user
    const eventCheck = await sql`
      SELECT id FROM events
      WHERE id = ${id} AND user_id = ${user.id}
      LIMIT 1
    ` as Array<{ id: string }>;

    if (!eventCheck[0]) {
      return NextResponse.json(
        createErrorResponse('Event not found', 404),
        { status: 404 }
      );
    }

    // Delete event
    await sql`
      DELETE FROM events
      WHERE id = ${id} AND user_id = ${user.id}
    `;

    return NextResponse.json(
      createSuccessResponse({ id }, 200),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting event:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

