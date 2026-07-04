import { NextResponse } from 'next/server';

const BACKEND = (process.env.BACKEND_URL || 'http://127.0.0.1:3001').replace(/\/api\/ping$/, '').replace(/\/api$/, '');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const response = await fetch(`${BACKEND}/api/knowledge/chat`, {
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
