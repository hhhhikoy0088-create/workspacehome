'use client';

import { useEffect, useRef } from 'react';
import { createLearningRecord } from '@/api/learning';
import { readAuthSession } from '@/lib/auth-session';

interface Options {
  subject?: string;
  topic?: string;
}

export function useLearningTracker(options?: Options) {
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    const session = readAuthSession();
    const userId = session.userId || session.user?.id || '';
    startTime.current = Date.now();

    const subject = options?.subject || 'general';
    const topic = options?.topic || window.location.pathname;

    if (userId) {
      // 页面加载时记录学习开始 —— 失败静默，不影响 UI
      createLearningRecord({
        user_id: userId,
        subject,
        topic,
        record_type: 'start',
        study_minutes: 0,
        mastery: 0,
        note: 'auto start learning'
      }).catch(() => {
        /* 后端不可达时静默忽略 */
      });

      // 每天打开页面即记录活跃
      fetch('/api/daily-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, source: 'open_app' })
      }).catch(() => {});
    }

    // 页面卸载 / 组件销毁时用 sendBeacon 发送（浏览器保证发出，不阻塞卸载）
    const sendComplete = () => {
      if (!userId) return;
      const duration = Math.round((Date.now() - startTime.current) / 60000);
      const payload = JSON.stringify({
        user_id: userId,
        subject,
        topic,
        record_type: 'complete',
        study_minutes: duration,
        mastery: Math.min(100, duration * 10),
        note: 'auto complete learning'
      });
      try {
        const ok = navigator.sendBeacon(
          `/api/learning-records`,
          new Blob([payload], { type: 'application/json' })
        );
        // sendBeacon 不可用时回退到 fetch（keepalive 模式）
        if (!ok) {
          fetch(
            `/api/learning-records`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }
          ).catch(() => {});
        }
      } catch {
        /* 静默 */
      }
    };

    const handleUnload = () => sendComplete();

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      sendComplete();
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);
}
