import { NextResponse } from 'next/server';
import OpenAI from 'openai';

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
    });
  }
  return _client;
}

function normalizeRows(rows: any[]) {
  return rows.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const normalized: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[String(key).trim()] = value;
    }
    return normalized;
  });
}

function buildDatasetSummary(rows: any[]) {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row || {}))));
  return {
    rowCount: rows.length,
    columns: keys,
    sampleRows: rows.slice(0, 10)
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rows = Array.isArray(body?.rows) ? normalizeRows(body.rows) : [];

    if (!rows.length) {
      return NextResponse.json({ success: false, message: 'rows is required' }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'DEEPSEEK_API_KEY 未配置' }, { status: 500 });
    }

    const summary = buildDatasetSummary(rows);
    const prompt = `你是一个数据分析助手。请基于下面的 Excel JSON 数据，输出严格 JSON。
要求：
1. 只能基于输入数据分析，不允许编造
2. 返回数据概览、KPI指标、趋势分析、异常数据、风险点、建议
3. 如果无法判断某项，返回 null 或空数组
4. 输出必须包含 markdownSummary 字段，方便前端渲染

输出格式：
{
  "overview": {
    "rowCount": number,
    "columnCount": number,
    "keyFindings": string[]
  },
  "kpis": [
    { "label": string, "value": string, "delta": string }
  ],
  "trendAnalysis": string[],
  "anomalies": string[],
  "risks": string[],
  "suggestions": string[],
  "markdownSummary": string
}

数据样本：
${JSON.stringify(summary, null, 2)}`;

    const completion = await getClient().chat.completions.create({
      model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat',
      messages: [
        { role: 'system', content: '只输出严格 JSON，不要解释。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 2500
    });

    const content = completion.choices[0]?.message?.content || '';
    if (!content.trim()) {
      return NextResponse.json({ success: false, message: 'AI 返回空内容' }, { status: 502 });
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        success: false,
        message: 'AI 返回格式异常',
        rawContent: content.slice(0, 200)
      }, { status: 502 });
    }
    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      analysis: parsed,
      summary,
      rows: summary.sampleRows
    });
  } catch (error: any) {
    console.error('[ANALYZE-DATA ERROR]', error?.message || error);
    // Ensure we always return JSON, never let Next.js return an HTML error page
    return NextResponse.json(
      { success: false, message: error?.message || '分析服务暂时不可用' },
      { status: 500 }
    );
  }
}
