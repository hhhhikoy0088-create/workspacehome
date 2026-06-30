'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/components/auth-provider';

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: '学习教练', href: '/learning-coach' },
  { label: '成长仪表盘', href: '/growth' },
  { label: '知识库', href: '/knowledge' },
  { label: '办公效率中心', href: '/office-hub' },
  { label: '个人中心', href: '/profile' }
];

function createDefaultProfile() {
  return { id: '', name: '', avatar: '', isLoggedIn: false, identity: '', profession: '', goal: '', goalTargetDate: '', level: 'Lv.1 Explorer' };
}

export function WorkspaceShell({ children, active }: { children: ReactNode; active: string }) {
  const router = useRouter();
  const { user, isLogin, loading, logout, refresh } = useAuthStore();
  const [profile, setProfile] = useState(createDefaultProfile());

  useEffect(() => {
    const sync = () => {
      const next = user?.id
        ? {
            id: user.id,
            name: user.nickname || user.name || '',
            avatar: user.avatar || '',
            isLoggedIn: true,
            identity: user.identity || '',
            profession: user.profession || '',
            goal: user.goal || '',
            goalTargetDate: user.goalTargetDate || '',
            level: 'Lv.1 Explorer'
          }
        : createDefaultProfile();
      setProfile(next);
    };

    sync();
    const handleUpdate = () => {
      refresh().catch(() => {});
      sync();
    };
    window.addEventListener('USER_UPDATED', handleUpdate);
    window.addEventListener('PROFILE_UPDATED', handleUpdate);
    window.addEventListener('workspace-profile-updated', handleUpdate);
    window.addEventListener('auth:changed', handleUpdate);
    return () => {
      window.removeEventListener('USER_UPDATED', handleUpdate);
      window.removeEventListener('PROFILE_UPDATED', handleUpdate);
      window.removeEventListener('workspace-profile-updated', handleUpdate);
      window.removeEventListener('auth:changed', handleUpdate);
    };
  }, [refresh, user]);

  return (
    <main className="min-h-screen px-4 py-4 md:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100dvh-2rem)] max-w-[1400px] gap-4 xl:grid-cols-[260px_1fr]">
        <aside className="panel flex flex-col">
          {loading ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4 text-sm text-zinc-500">正在同步个人状态...</div>
          ) : profile.isLoggedIn ? (
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-800/50 p-4 transition hover:border-zinc-700 hover:bg-zinc-800"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-lg font-semibold text-white">
                {profile.avatar || '未'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-100">{profile.name || '未登录'}</p>
                <p className="mt-0.5 text-xs text-blue-400">{profile.level || profile.identity || 'Pro 会员'}</p>
              </div>
            </Link>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
              <Link href="/auth/login" className="block text-sm font-semibold text-zinc-100 transition hover:text-blue-400">
                登录 / 注册
              </Link>
              <p className="mt-1 text-xs text-zinc-500">登录后同步长期记忆</p>
            </div>
          )}

          <div className="mt-4 border-t border-zinc-800 pt-4">
            <p className="text-lg font-semibold text-zinc-50">Shrimp AI</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">长期记忆 · 学习教练 · 工作秘书</p>
          </div>

          <nav className="mt-4 flex-1 space-y-1">
            {navItems.map((item, index) => {
              const isActive = active === item.href;
              return (
                <Link
                  key={`${item.href}-${index}`}
                  href={item.href}
                  className={`nav-item ${isActive ? 'nav-item-active' : 'nav-item-idle'}`}
                >
                  <span>{item.label}</span>
                  {isActive ? <motion.span layoutId="nav-indicator" className="h-1.5 w-1.5 rounded-full bg-blue-500" /> : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-zinc-800 pt-4">
            {isLogin ? (
              <button type="button" onClick={() => { logout(); router.push('/auth/login'); }} className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-900">
                退出登录
              </button>
            ) : null}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col gap-4">{children}</section>
      </div>
    </main>
  );
}
