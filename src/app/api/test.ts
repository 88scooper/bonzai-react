import { NextResponse } from 'next/server';

export async function GET() {
  // Your database logic goes here
  return NextResponse.json({ success: true, data: "Proplytics Data" });
}