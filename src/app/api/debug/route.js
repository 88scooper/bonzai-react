import { NextResponse } from 'next/server';

// GET /api/debug - Debug production environment
export async function GET(request) {
  try {
    const debugInfo = {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      database: {
        type: 'PostgreSQL (Neon)',
        configured: !!process.env.DATABASE_URL
      },
      auth: {
        type: 'JWT',
        configured: true
      }
    };

    return NextResponse.json({
      success: true,
      data: debugInfo,
      message: 'Debug information retrieved'
    }, { status: 200 });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Debug failed'
    }, { status: 500 });
  }
}