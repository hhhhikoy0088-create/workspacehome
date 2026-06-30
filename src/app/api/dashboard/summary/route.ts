import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'demo-user';
    const response = await fetch(`${API_BASE}/dashboard/summary?userId=${encodeURIComponent(userId)}`);
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || '请求失败' }, { status: 500 });
  }
}
