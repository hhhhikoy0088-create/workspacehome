import { NextResponse } from 'next/server';

interface MeetingSummaryRequest {
  text?: string;
  fullText?: string;
}

interface MeetingSummary {
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: Array<{
    task: string;
    assignee: string;
    deadline: string;
  }>;
  suggestions: string;
}

export async function POST(req: Request) {
  try {
    const { text, fullText } = (await req.json()) as MeetingSummaryRequest;
    const meetingText = text || fullText;

    if (!meetingText || meetingText.trim().length === 0) {
      return NextResponse.json({ error: '文本内容不能为空' }, { status: 400 });
    }

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApiKey) {
      return NextResponse.json(
        { error: 'DeepSeek API 密钥未配置' },
        { status: 500 }
      );
    }

    const prompt = `请分析以下会议记录，并生成结构化的会议纪要。

会议记录：
${meetingText}

请按以下 JSON 格式返回结果，不要返回其他内容：
{
  "summary": "用一段话总结会议内容（50-100字）",
  "keyPoints": ["重点讨论事项1", "重点讨论事项2", "重点讨论事项3"],
  "decisions": ["决策事项1", "决策事项2"],
  "actionItems": [
    {"task": "待办事项1", "assignee": "负责人1", "deadline": "截止时间1"},
    {"task": "待办事项2", "assignee": "负责人2", "deadline": "截止时间2"}
  ],
  "suggestions": "AI 的建议或后续行动建议（100字以内）"
}`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的会议记录分析员。请仔细分析会议内容，生成结构化的会议纪要。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('DeepSeek API error:', error);
      return NextResponse.json(
        { error: 'DeepSeek API 调用失败' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: '无法解析 API 响应' },
        { status: 500 }
      );
    }

    // 提取 JSON 对象
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: '解析会议纪要失败' },
        { status: 500 }
      );
    }

    const summary: MeetingSummary = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    console.error('Meeting summary error:', error);
    return NextResponse.json(
      { error: error.message || '生成会议纪要失败' },
      { status: 500 }
    );
  }
}
