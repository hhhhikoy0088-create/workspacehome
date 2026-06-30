import { NextResponse } from 'next/server';

interface SummaryRequest {
  fullText: string;
}

interface SummaryResponse {
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: Array<{
    task: string;
    owner: string;
    deadline: string;
  }>;
  teamMembers: string[];
  timeline: string;
  suggestions: string[];
}

export async function POST(req: Request) {
  try {
    const { fullText } = (await req.json()) as SummaryRequest;

    if (!fullText || fullText.trim().length === 0) {
      return NextResponse.json(
        { error: '没有会议文字内容' },
        { status: 400 }
      );
    }

    // 检查 API 密钥配置
    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json({
        summary: '（演示模式）根据会议内容的摘要会在这里显示',
        keyPoints: ['关键讨论点1', '关键讨论点2', '关键讨论点3'],
        decisions: ['根据讨论内容，需要进一步跟进'],
        actionItems: [],
        teamMembers: [],
        timeline: '待定',
        suggestions: [],
        success: true,
        demo: true
      });
    }

    try {
      // 使用 DeepSeek 进行分析
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是一个专业的会议纪要生成助手。你需要根据会议全文内容，生成结构化的会议纪要。
请按以下 JSON 格式返回（务必返回合法的 JSON）：
{
  "summary": "会议摘要（100字以内）",
  "keyPoints": ["重点讨论1", "重点讨论2", "重点讨论3"],
  "decisions": ["决策事项1", "决策事项2"],
  "actionItems": [
    {"task": "待办事项1", "owner": "负责人1", "deadline": "截止时间1"}
  ],
  "teamMembers": ["参与者1", "参与者2"],
  "timeline": "关键时间节点或下次会议时间",
  "suggestions": ["建议1", "建议2", "建议3"]
}`
            },
            {
              role: 'user',
              content: `请根据以下会议内容生成纪要：\n\n${fullText}`
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('DeepSeek API error:', error);
        throw new Error(`DeepSeek API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('无法从 API 获取响应');
      }

      // 解析返回的 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('API 返回格式错误');
      }

      const result = JSON.parse(jsonMatch[0]) as SummaryResponse;

      return NextResponse.json({
        ...result,
        success: true
      });
    } catch (apiError: any) {
      console.error('DeepSeek 分析错误:', apiError);
      return NextResponse.json({
        summary: '分析失败，请重试',
        keyPoints: [],
        decisions: [],
        actionItems: [],
        teamMembers: [],
        timeline: '',
        suggestions: [],
        success: false,
        error: apiError.message
      });
    }
  } catch (error: any) {
    console.error('Meeting summary error:', error);
    return NextResponse.json(
      {
        error: error.message || '生成纪要失败',
        code: 500
      },
      { status: 500 }
    );
  }
}
