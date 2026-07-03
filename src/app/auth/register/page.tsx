'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import request from '@/api/request';
import { writeAuthSession } from '@/lib/auth-session';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', code: '' });
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  const onChange = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const sendCode = async () => {
    if (!form.email) {
      setMessage('请先输入邮箱');
      return;
    }

    try {
      setSending(true);
      setMessage('');
      const result = await request.post('/auth/send-code', { email: form.email });
      const devCode = result?.devCode ?? result?.data?.devCode;
      if (devCode) {
        setMessage(`验证码：${devCode}（邮件服务未配置，直接显示验证码）`);
      } else {
        setMessage('验证码已发送至邮箱，请查收。');
      }
    } catch (error: any) {
      setMessage(error?.response?.data?.message || error?.message || '发送验证码失败');
      console.error('Send code error:', error?.response?.data || error?.message || error);
    } finally {
      setSending(false);
    }
  };

  const register = async () => {
    if (form.password !== form.confirmPassword) {
      setMessage('两次密码输入不一致');
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      const result = await request.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        code: form.code
      });
      const user = result?.user ?? result?.data?.user;
      const token = result?.token ?? result?.data?.token ?? '';
      if (user) {
        writeAuthSession({
          user: {
            id: user.id,
            name: user.name || '未命名用户',
            nickname: user.nickname || user.name || '未命名用户',
            avatar: user.avatar || (user.name || '未').slice(0, 1),
            identity: user.identity || '',
            profession: user.profession || '',
            goal: user.goal || '',
            goalTargetDate: user.goalTargetDate || user.goal_target_date || ''
          },
          token
        });
      }
      setMessage('注册成功，正在跳转登录页...');
      router.push('/auth/login');
    } catch (error: any) {
      setMessage(error?.response?.data?.message || error?.message || '注册失败');
      console.error('Register error:', error?.response?.data || error?.message || error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page flex min-h-[100dvh] items-center justify-center px-4 py-8">
      <div className="auth-orb auth-orb-left" aria-hidden="true" />

      <section className="panel auth-card relative z-10 w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-zinc-50">创建 Workspace 账号</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-400">注册后即可开启长期记忆、知识库和学习教练。</p>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">昵称</label>
              <input value={form.name} onChange={(e) => onChange('name', e.target.value)} className="input-field" placeholder="张三" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">邮箱</label>
              <input value={form.email} onChange={(e) => onChange('email', e.target.value)} className="input-field" placeholder="name@example.com" />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">密码</label>
            <input value={form.password} onChange={(e) => onChange('password', e.target.value)} type="password" className="input-field" placeholder="设置密码" />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">确认密码</label>
            <input value={form.confirmPassword} onChange={(e) => onChange('confirmPassword', e.target.value)} type="password" className="input-field" placeholder="再次输入密码" />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm text-zinc-400">邮箱验证码</label>
              <button type="button" onClick={sendCode} disabled={sending} className="text-sm text-blue-400 transition hover:text-blue-300 disabled:opacity-60">
                {sending ? '发送中...' : '发送验证码'}
              </button>
            </div>
            <input value={form.code} onChange={(e) => onChange('code', e.target.value)} className="input-field" placeholder="请输入邮箱收到的验证码" />
          </div>

          <button onClick={register} disabled={loading} className="btn-primary w-full py-3">
            {loading ? '注册中...' : '注册 Workspace'}
          </button>

          {message ? <p className="text-center text-sm text-zinc-400">{message}</p> : null}

          <p className="text-center text-sm text-zinc-500">
            已有账号？{' '}
            <Link href="/auth/login" className="font-medium text-blue-400 transition hover:text-blue-300">
              去登录
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
