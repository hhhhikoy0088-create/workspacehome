'use client';

import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { chatApi, createChatMessageApi, getChatMessagesApi } from '@/api';
import { useAuthStore } from '@/components/auth-provider';

const suggestions = ['打开学习计划', '查询积分换元法', '查看今日任务', '分析我的学习状态'];
const initialAssistantMessage = '你好，我是小w，今天想学习什么？';

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
      } catch {
        if (!cancelled) {
          setMessages([{ role: 'assistant', content: initialAssistantMessage }]);
        }
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
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '请求失败，请稍后再试。' }]);
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
    <main className="h-[100dvh] overflow-hidden px-4 py-4 text-slate-800 md:px-6 lg:px-8">
      <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <header className="flex-shrink-0 border-b border-slate-200/70 p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-indigo-500 transition hover:border-indigo-200 hover:bg-indigo-50/50"
              >
                ←
              </Link>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-2xl font-bold text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)]">W</div>
              <div>
                <p className="text-lg font-semibold text-slate-800">workspace</p>
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
                    className={`max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-7 md:max-w-[70%] ${
                      m.role === 'user'
                        ? 'border-transparent bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_4px_16px_rgba(99,102,241,0.2)]'
                        : 'border-slate-200/70 bg-slate-50/80 text-slate-700'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm leading-7 text-slate-500">小W 正在思考中...</div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-shrink-0 border-t border-slate-200/70 p-4 md:p-5">
            <div className="mb-3 flex flex-wrap gap-2">
              {suggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => send(item)}
                  disabled={loading}
                  className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="问 workspace 任何问题..."
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition hover:from-indigo-600 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ↑
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 p-6 text-slate-500">加载中...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}
