'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import request from '@/api/request';
import { useAuthStore } from '@/components/auth-provider';

export default function LoginPage() {
  const router = useRouter();
  const { login: setAuthUser } = useAuthStore();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    try {
      setLoading(true);
      setMessage('');
      const result = await request.post('/auth/login', { account, password });
      console.log('[login page] result =', result);
      console.log('[login page] result.user =', result?.user);
      console.log('[login page] result.data =', result?.data);
      console.log('[login page] result.data.user =', result?.data?.user);
      console.log('[login page] token =', result?.token ?? result?.data?.token);

      const rawUser = result?.user ?? result?.data?.user;
      const token = result?.token ?? result?.data?.token ?? '';
      if (!rawUser?.id) {
        throw new Error('登录成功但未返回用户信息');
      }
      const authUser = {
        id: rawUser.id,
        name: rawUser.name || '未命名用户',
        nickname: rawUser.nickname || rawUser.name || '未命名用户',
        avatar: rawUser.avatar || (rawUser.name || '未').slice(0, 1),
        identity: rawUser.identity || '',
        profession: rawUser.profession || '',
        goal: rawUser.goal || '',
        goalTargetDate: rawUser.goalTargetDate || rawUser.goal_target_date || ''
      };
      await setAuthUser(authUser, token);
      setMessage('登录成功，正在跳转...');
      router.replace('/dashboard');
      console.log('Current auth state =', authUser);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || error?.message || '登录失败');
      console.error('Login error:', error?.response?.data || error?.message || error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page flex min-h-[100dvh] items-center justify-center px-4 py-8">
      <div className="auth-orb auth-orb-left" aria-hidden="true" />

      <section className="panel auth-card relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium text-blue-400">Shrimp AI Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-50">欢迎回来</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-400">登录后即可继续使用长期记忆、知识库、任务管理和学习教练。</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-zinc-400">邮箱或手机号</label>
            <input
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="input-field"
              placeholder="请输入邮箱或手机号"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-zinc-400">密码</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="input-field"
              placeholder="请输入密码"
            />
          </div>

          <div className="flex items-center justify-between text-sm text-zinc-500">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-zinc-600 bg-zinc-900 accent-blue-500" />
              记住我
            </label>
            <a href="#" className="text-blue-400 transition hover:text-blue-300">
              忘记密码
            </a>
          </div>

          <button onClick={handleLogin} disabled={loading} className="btn-primary w-full py-3">
            {loading ? '登录中...' : '登录 Workspace'}
          </button>

          {message ? <p className="text-center text-sm text-zinc-400">{message}</p> : null}

          <p className="text-center text-sm text-zinc-500">
            还没有账号？{' '}
            <Link href="/auth/register" className="font-medium text-blue-400 transition hover:text-blue-300">
              立即注册
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
