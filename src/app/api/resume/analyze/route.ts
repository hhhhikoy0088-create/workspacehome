import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000); // 180 秒，绕开 rewrite 30 秒限制

  try {
    // 提取前端传来的 multipart formData
    const formData = await request.formData();

    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3001';
    const url = `${backendUrl}/api/resume/analyze`;

    console.log('[Resume Route] forwarding to', url, 'file:', formData.get('file')?.name || 'N/A');

    const response = await fetch(url, {
      method: 'POST',
      body: formData, // fetch 自动设置 multipart boundary
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      console.error('[Resume Route] backend error', response.status, text);
      return NextResponse.json(
        { success: false, message: text || '后端分析失败' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Resume Route] error:', error?.message || error);
    return NextResponse.json(
      { success: false, message: error?.message || '请求超时或失败，请重试' },
      { status: 504 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
