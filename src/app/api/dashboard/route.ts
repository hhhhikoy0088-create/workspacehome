import { NextResponse } from 'next/server';

// 服务端 fetch 用 BACKEND_URL，去掉 /api/ping 后缀
const BACKEND = (process.env.BACKEND_URL || 'http://127.0.0.1:3001').replace(/\/api\/ping$/, '').replace(/\/api$/, '');

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'demo-user';
    const response = await fetch(`${BACKEND}/api/dashboard?userId=${encodeURIComponent(userId)}`);
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || '请求失败' }, { status: 500 });
  }
}
