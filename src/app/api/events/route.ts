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
 * GET /api/events
 * Get all events for the authenticated user
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
    const events = await sql`
      SELECT id, user_id, date, time, description, property, notify, recurrence,
             created_at, updated_at
      FROM events
      WHERE user_id = ${user.id}
      ORDER BY date ASC, time ASC NULLS LAST
    ` as Event[];

    return NextResponse.json(
      createSuccessResponse(events),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching events:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 * Create a new event
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
    const body = await request.json();
    
    // Validate required fields
    if (!body.date || !body.description) {
      return NextResponse.json(
        createErrorResponse('Date and description are required', 400),
        { status: 400 }
      );
    }

    const {
      date,
      time,
      description,
      property,
      notify,
      recurrence
    } = body;

    // Create event
    const result = await sql`
      INSERT INTO events (
        user_id, date, time, description, property, notify, recurrence
      )
      VALUES (
        ${user.id},
        ${date}::date,
        ${time || null}::time,
        ${description},
        ${property || null},
        ${notify || false},
        ${recurrence ? JSON.stringify(recurrence) : null}::jsonb
      )
      RETURNING id, user_id, date, time, description, property, notify, recurrence,
                 created_at, updated_at
    ` as Event[];

    if (!result[0]) {
      return NextResponse.json(
        createErrorResponse('Failed to create event', 500),
        { status: 500 }
      );
    }

    return NextResponse.json(
      createSuccessResponse(result[0], 201),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating event:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

