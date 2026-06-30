import { NextResponse } from 'next/server';

const KB_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const response = await fetch(`${KB_API_BASE}/knowledge/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Chat failed' }, { status: 500 });
  }
}
