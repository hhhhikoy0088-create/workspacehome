'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { WorkspaceShell } from '@/components/workspace-shell';

const PROFILE_KEY = 'workspace-profile';

type Comment = {
  author: string;
  text: string;
  time: string;
};

type Post = {
  id: number;
  author: string;
  time: string;
  content: string;
  likes: number;
  likedByMe: boolean;
  comments: Comment[];
};

const STORAGE_KEY = 'workspace-community-posts';

const initialPosts: Post[] = [
  {
    id: 1,
    author: '小林',
    time: '10 分钟前',
    content: '今天把英语单词整理成了卡片，效率高了很多。',
    likes: 3,
    likedByMe: false,
    comments: [{ author: '阿宁', time: '9 分钟前', text: '这个方法很适合我，准备试试。' }]
  },
  {
    id: 2,
    author: '阿宁',
    time: '32 分钟前',
    content: '用番茄钟做学习记录，发现专注时间明显提升。',
    likes: 5,
    likedByMe: false,
    comments: [{ author: '小周', time: '28 分钟前', text: '番茄钟确实能帮我进入状态。' }]
  },
  {
    id: 3,
    author: '小周',
    time: '1 小时前',
    content: '今天复盘了数学错题，感觉比单纯刷题更有效。',
    likes: 2,
    likedByMe: false,
    comments: []
  }
];

function loadPosts() {
  if (typeof window === 'undefined') return initialPosts;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialPosts;
    const parsed = JSON.parse(raw) as Post[];
    return Array.isArray(parsed) && parsed.length ? parsed : initialPosts;
  } catch {
    return initialPosts;
  }
}

function loadProfileName() {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw) as { name?: string; isLoggedIn?: boolean };
    return parsed?.isLoggedIn ? parsed?.name || '' : '';
  } catch {
    return '';
  }
}

export default function CommunityPage() {
  const [mounted, setMounted] = useState(false);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [profileName, setProfileName] = useState('');
  const [anonymousPost, setAnonymousPost] = useState(false);
  const [content, setContent] = useState('');
  const [commentAnonymous, setCommentAnonymous] = useState<Record<number, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});

  const canPublish = useMemo(() => content.trim().length > 0, [content]);
  const defaultDisplayName = profileName || '匿名用户';

  useEffect(() => {
    setMounted(true);
    setPosts(loadPosts());
    const nextProfileName = loadProfileName();
    if (nextProfileName) {
      setProfileName(nextProfileName);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }, [posts, mounted]);

  const publish = () => {
    if (!canPublish) return;
    const nextAuthor = anonymousPost ? '匿名用户' : defaultDisplayName;
    setPosts((prev) => [
      {
        id: Date.now(),
        author: nextAuthor,
        time: '刚刚',
        content: content.trim(),
        likes: 0,
        likedByMe: false,
        comments: []
      },
      ...prev
    ]);
    setContent('');
  };

  const likePost = (id: number) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id
          ? {
              ...post,
              likes: post.likedByMe ? Math.max(0, post.likes - 1) : post.likes + 1,
              likedByMe: !post.likedByMe
            }
          : post
      )
    );
  };

  const addComment = (id: number) => {
    const text = (commentDrafts[id] || '').trim();
    if (!text) return;
    const commenter = commentAnonymous[id] ? '匿名' : defaultDisplayName;
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id
          ? {
              ...post,
              comments: [...post.comments, { author: commenter, time: '刚刚', text }]
            }
          : post
      )
    );
    setCommentDrafts((prev) => ({ ...prev, [id]: '' }));
  };

  const clearAll = () => {
    setPosts(initialPosts);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <WorkspaceShell active="/community">
      <section className="panel text-zinc-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-zinc-500">studyhome</p>
            <h1 className="mt-2 text-5xl font-semibold tracking-tight text-zinc-50">学习社区</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">在这里，学习经历像聊天一样自然流动，大家可以分享进展、提问、回应彼此，也可以匿名轻松参与。</p>
          </div>
          <Link href="/profile" className="rounded-full border border-zinc-800 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800">
            返回个人中心
          </Link>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          <section className="panel text-zinc-100">
            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-zinc-800 bg-zinc-800/30 px-4 py-3 text-sm text-zinc-400">
                  默认昵称：<span className="font-medium text-zinc-50">{defaultDisplayName}</span>
                </div>
                <label className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-800/30 px-4 py-3 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={anonymousPost}
                    onChange={(e) => setAnonymousPost(e.target.checked)}
                    className="rounded border-zinc-700"
                  />
                  匿名发布
                </label>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="说说今天的学习经历，比如：我今天背了 50 个单词"
                rows={3}
                className="w-full rounded-md border border-zinc-800 bg-zinc-800/30 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-blue-500/40"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-full border border-zinc-800 bg-zinc-800/60 px-5 py-3 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800"
                >
                  清空社区
                </button>
                <button
                  type="button"
                  onClick={publish}
                  disabled={!canPublish}
                  className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  发布学习经历
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            {posts.map((post) => (
              <article key={post.id} className="rounded-xl border border-zinc-800 bg-zinc-800/60 p-5 text-zinc-100 shadow-[0_24px_80px_rgba(123,110,101,0.08)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white font-semibold">
                    {post.author.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{post.author}</p>
                        <p className="text-xs text-zinc-500">{post.time}</p>
                      </div>
                      <button
                        onClick={() => likePost(post.id)}
                        className={`rounded-full border px-3 py-1 text-xs transition ${post.likedByMe ? 'border-blue-500/40 bg-zinc-800/40 text-zinc-50' : 'border-zinc-800 bg-zinc-800/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800'}`}
                      >
                        {post.likedByMe ? '已点赞' : '点赞'} {post.likes}
                      </button>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-zinc-400">{post.content}</p>
                    <div className="mt-4 space-y-2">
                      {post.comments.map((comment, index) => (
                        <div key={`${post.id}-${index}`} className="rounded-lg bg-zinc-800/30 px-4 py-2 text-sm text-zinc-300">
                          <span className="font-semibold text-zinc-50">{comment.author}</span>：{comment.text}
                          <span className="ml-2 text-xs text-zinc-500">{comment.time}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-zinc-400">评论默认使用当前登录昵称</span>
                        <label className="flex items-center gap-2 text-xs text-zinc-400">
                          <input
                            type="checkbox"
                            checked={Boolean(commentAnonymous[post.id])}
                            onChange={(e) => setCommentAnonymous((prev) => ({ ...prev, [post.id]: e.target.checked }))}
                            className="rounded border-zinc-700"
                          />
                          匿名评论
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={commentDrafts[post.id] || ''}
                          onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder="回复一句..."
                          className="flex-1 rounded-full border border-zinc-800 bg-zinc-800/30 px-4 py-2 text-sm outline-none placeholder:text-zinc-500 focus:border-blue-500/40"
                        />
                        <button onClick={() => addComment(post.id)} className="rounded-full border border-zinc-800 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800">
                          评论
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="panel text-zinc-100">
            <p className="text-sm text-zinc-500">右侧公告</p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-50">社区公告</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-zinc-400">
              <p>1. 欢迎分享自己的学习经历，真实、轻松就好。</p>
              <p>2. 可以点赞、评论、回应别人的内容。</p>
              <p>3. 保持互相鼓励，不要太正式。</p>
            </div>
          </section>

          <section className="panel text-zinc-100">
            <p className="text-sm text-zinc-500">今日活跃</p>
            <div className="mt-3 space-y-3 text-sm text-zinc-400">
              <div className="rounded-lg bg-zinc-800/60 px-4 py-3">小林 · 背了 50 个单词</div>
              <div className="rounded-lg bg-zinc-800/60 px-4 py-3">阿宁 · 完成了番茄钟训练</div>
              <div className="rounded-lg bg-zinc-800/60 px-4 py-3">小周 · 复盘错题 20 道</div>
            </div>
          </section>
        </aside>
      </section>
    </WorkspaceShell>
  );
}
