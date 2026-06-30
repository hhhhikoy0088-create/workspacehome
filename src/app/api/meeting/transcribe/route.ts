import { NextResponse } from 'next/server';
import crypto from 'crypto';

function generateBaiduAuth(path: string, query: string): { [key: string]: string } {
  const apiKey = process.env.BAIDU_ASR_API_KEY;
  const secretKey = process.env.BAIDU_ASR_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error('缺少百度 ASR API 配置');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const expirationInSeconds = 300;
  const expiration = timestamp + expirationInSeconds;

  const stringToSign = `${path}\n${query}\n${apiKey}\n${timestamp}`;
  const sign = crypto
    .createHmac('sha256', secretKey)
    .update(stringToSign)
    .digest('base64');

  return {
    'X-BAIDU-TIMESTAMP': timestamp,
    'Authorization': `Bearer ${apiKey}:${sign}`,
    'Content-Type': 'application/octet-stream'
  };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '没有收到音频文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const validTypes = ['audio/webm', 'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a'];
    const isValidType = validTypes.some((type) => file.type.includes(type.split('/')[1])) ||
      file.name.match(/\.(mp3|wav|m4a|webm)$/i);

    if (!isValidType) {
      return NextResponse.json(
        { error: '不支持的音频格式，请使用 WebM、MP3、WAV 或 M4A' },
        { status: 400 }
      );
    }

    // 检查 API 密钥配置
    if (!process.env.BAIDU_ASR_API_KEY) {
      return NextResponse.json({
        text: '[演示模式] 百度 ASR API 未配置。若要启用真实转录，请配置 BAIDU_ASR_API_KEY 和 BAIDU_ASR_SECRET_KEY。',
        success: true,
        demo: true
      });
    }

    try {
      const buffer = await file.arrayBuffer();

      // 百度 ASR API 参数
      const path = '/asr/2.0/recognize';
      const query = 'lang_type=zh_cn&rate=16000&format=wav';
      
      const headers = generateBaiduAuth(path, query);

      const response = await fetch(`https://vop.baidu.com${path}?${query}`, {
        method: 'POST',
        headers,
        body: buffer
      });

      if (!response.ok) {
        throw new Error(`百度 API 返回错误: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.err_no !== 0) {
        console.error('百度 ASR 错误:', data);
        throw new Error(data.err_msg || '转录失败');
      }

      const text = data.result?.[0] || '';

      return NextResponse.json({
        text: text || '转录失败，音频可能不清晰',
        success: true
      });
    } catch (apiError: any) {
      console.error('百度 ASR 转录错误:', apiError);
      return NextResponse.json({
        text: '[演示模式] 转录服务暂时不可用。实际转录内容会在这里显示。',
        success: true,
        demo: true,
        error: apiError.message
      });
    }
  } catch (error: any) {
    console.error('转录处理错误:', error);
    return NextResponse.json(
      {
        error: error.message || '转录失败',
        code: 500
      },
      { status: 500 }
    );
  }
}
