'use client';

import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { chatApi, createChatMessageApi, getChatMessagesApi } from '@/api';
import { useAuthStore } from '@/components/auth-provider';

const suggestions = ['打开学习计划', '查询积分换元法', '查看今日任务', '分析我的学习状态'];
const initialAssistantMessage = '你好，我是小龙虾 AI，可以帮你学习、整理资料和规划任务。';

type Message = { role: 'user' | 'assistant'; content: string };

function ChatPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuthStore();
  const userId = user?.id || '';
  const isSendingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: initialAssistantMessage }]);

  useEffect(() => {
    const q = params.get('q')?.trim();
    if (q) {
      setInput(q);
    }
  }, [params]);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      if (!userId) {
        if (!cancelled) {
          setMessages([{ role: 'assistant', content: initialAssistantMessage }]);
        }
        return;
      }

      try {
        const history = await getChatMessagesApi(userId);
        if (cancelled) return;

        if (Array.isArray(history) && history.length > 0) {
          setMessages(
            history.map((item: any) => ({
              role: item.role,
              content: item.content
            }))
          );
        } else {
          setMessages([{ role: 'assistant', content: initialAssistantMessage }]);
        }
      } catch (error: any) {
        if (!cancelled) {
          setMessages([{ role: 'assistant', content: initialAssistantMessage }]);
        }
        console.error('Load chat history error:', error?.message || error);
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const value = text.trim();
    if (!value || isSendingRef.current) return;

    isSendingRef.current = true;
    setLoading(true);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: value }]);
    router.replace(`/chat?q=${encodeURIComponent(value)}`);

    try {
      if (!userId) {
        throw new Error('userId is required');
      }

      await createChatMessageApi({ user_id: userId, role: 'user', content: value });
      const result = await chatApi(value);
      const reply = result?.reply || result?.raw || 'AI 暂时没有返回内容';
      await createChatMessageApi({ user_id: userId, role: 'assistant', content: reply });

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (error: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: '请求失败，请稍后再试。' }]);
      console.error('Chat API error:', error?.message || error);
    } finally {
      isSendingRef.current = false;
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send(input);
  };

  return (
    <main className="h-[100dvh] overflow-hidden px-4 py-4 text-zinc-100 md:px-6 lg:px-8">
      <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80 shadow-panel backdrop-blur-2xl">
        <header className="flex-shrink-0 border-b border-zinc-800 p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-800/60 text-blue-400 transition hover:border-zinc-700 hover:bg-zinc-800"
              >
                ←
              </Link>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-2xl text-white">W</div>
              <div>
                <p className="text-lg font-semibold text-zinc-50">workspace</p>
                <p className="text-sm text-zinc-500">你好，我是小W，有什么可以帮助你。</p>
              </div>
            </div>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5">
            <div className="space-y-4">
              {messages.map((m, idx) => (
                <div key={`${m.role}-${idx}-${m.content.slice(0, 12)}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-lg border px-4 py-3 text-sm leading-7 md:max-w-[70%] ${
                      m.role === 'assistant' ? 'border-zinc-800 bg-zinc-800/60 text-zinc-50' : 'border-zinc-800 bg-zinc-800/40 text-zinc-50'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading ? (
                <div className="flex justify-start">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-800/60 px-4 py-3 text-sm leading-7 text-zinc-50">小W 正在思考中...</div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-shrink-0 border-t border-zinc-800 p-4 md:p-5">
            <div className="mb-3 flex flex-wrap gap-2">
              {suggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => send(item)}
                  disabled={loading}
                  className="rounded-full border border-zinc-800 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex gap-3 rounded-[20px] border border-zinc-800 bg-zinc-800/30 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="问 workspace 任何问题..."
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ↑
              </button>
            </div>

            <div className="mt-5 text-sm text-zinc-400">你发送的问题会进入长期记忆，并用于生成你的个人知识库。</div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 p-6 text-zinc-100">加载中...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}
