'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { WorkspaceShell } from '@/components/workspace-shell';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

type SheetData = Record<string, any>[];

type AnalysisResponse = {
  success: boolean;
  analysis?: {
    overview?: { rowCount?: number; columnCount?: number; keyFindings?: string[] };
    kpis?: Array<{ label: string; value: string; delta: string }>;
    trendAnalysis?: string[];
    anomalies?: string[];
    risks?: string[];
    suggestions?: string[];
    markdownSummary?: string;
  };
};

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899'];

function inferNumericField(rows: SheetData) {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0] || {});
  for (const key of keys) {
    const numericCount = rows.filter(
      (r) => r[key] !== '' && !Number.isNaN(Number(r[key]))
    ).length;
    if (numericCount >= Math.max(3, Math.floor(rows.length * 0.4))) return key;
  }
  return null;
}

function buildChartData(rows: SheetData) {
  if (!rows.length) return { barData: [], lineData: [], pieData: [] };
  const firstKey = Object.keys(rows[0] || {})[0] || '类别';
  const numericKey = inferNumericField(rows);

  const barData = rows.slice(0, 8).map((row, idx) => ({
    name: String(row[firstKey] ?? `项${idx + 1}`),
    value: numericKey ? Number(row[numericKey]) || 0 : Object.keys(row).length
  }));

  const lineData = rows.slice(0, 12).map((row, idx) => ({
    name: `P${idx + 1}`,
    value: numericKey ? Number(row[numericKey]) || 0 : idx + 1
  }));

  const categories = new Map<string, number>();
  rows.forEach((row) => {
    const key = String(row[firstKey] ?? '未分类');
    categories.set(key, (categories.get(key) || 0) + 1);
  });

  const pieData = Array.from(categories.entries())
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  return { barData, lineData, pieData };
}

export default function AnalyticsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('未上传');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetName, setSheetName] = useState('');
  const [rows, setRows] = useState<SheetData>([]);
  const [analysis, setAnalysis] = useState<AnalysisResponse['analysis'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const chartData = useMemo(() => buildChartData(rows), [rows]);

  const summaryCards = analysis?.overview?.keyFindings || [];
  const trendCards = analysis?.trendAnalysis || [];
  const riskCards = analysis?.risks || [];
  const previewRows = rows.slice(0, 10);
  const columns = previewRows[0] ? Object.keys(previewRows[0]) : [];

  const onPickFile = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setLoading(true);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const names = workbook.SheetNames || [];
      setSheetNames(names);

      const activeSheet = names[0] || '';
      setSheetName(activeSheet);

      const sheet = workbook.Sheets[activeSheet];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
      setRows(json);
      setAnalysis(null);
    } catch (err: any) {
      setError(err.message || 'Excel 解析失败');
      setRows([]);
      setSheetNames([]);
      setSheetName('');
    } finally {
      setLoading(false);
    }
  };

  const onAnalyze = async () => {
    if (!rows.length) {
      setError('请先上传并解析 Excel');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/analyze-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, sheetName, fileName })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'AI 分析失败');
      setAnalysis(data.analysis);
    } catch (err: any) {
      setError(err.message || '分析失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <WorkspaceShell active="/analytics">
      <div className="mb-4 flex items-center justify-start">
        <Link
          href="/office-hub"
          className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800"
        >
          <span className="text-base">←</span>
          返回办公效率中心
        </Link>
      </div>

      <div className="mb-6 rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-950 via-zinc-950 to-slate-950 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] md:p-8">
        <p className="text-sm font-medium tracking-[0.3em] text-cyan-300/80">DATA ANALYTICS</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">数据分析中心</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
          上传 Excel 后，自动完成字段识别、KPI 统计、图表生成、AI 总结与趋势预测，支持一键导出报告。
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        {/* 左侧 */}
        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-4"
        >
          <div className="panel">
            <h2 className="text-lg font-semibold text-zinc-50">操作面板</h2>
            <p className="mt-1 text-sm text-zinc-500">先上传文件，再选择 Sheet，最后触发 AI 分析。</p>

            <div className="mt-5 space-y-4">
              <button
                onClick={onPickFile}
                className="flex h-28 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-500/30 bg-cyan-500/5 text-cyan-200 transition hover:border-cyan-400/50 hover:bg-cyan-500/10"
              >
                <span className="text-2xl">⬆️</span>
                <span className="mt-2 text-sm font-medium">上传 Excel</span>
                <span className="mt-1 text-xs text-cyan-200/70">支持 .xlsx / .xls</span>
              </button>

              <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChange} />

              <button className="flex h-12 w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 text-sm text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800/80">
                <span>Sheet 选择</span>
                <span className="text-zinc-500">{sheetName || '请选择'}</span>
              </button>

              {sheetNames.length > 1 && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-2 text-sm text-zinc-300">
                  {sheetNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => setSheetName(name)}
                      className={`w-full rounded-lg px-3 py-2 text-left transition ${
                        sheetName === name ? 'bg-cyan-500/10 text-cyan-200' : 'hover:bg-zinc-900'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={onAnalyze}
                disabled={loading || !rows.length}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? '分析中...' : 'AI 分析'}
              </button>
            </div>
          </div>

          <section className="space-y-4">
            <section className="panel">
              <h3 className="text-lg font-semibold text-zinc-50">AI 总结</h3>
              <div className="mt-4 space-y-3 text-sm leading-7 text-zinc-300">
                {(summaryCards.length ? summaryCards : ['上传数据后，这里会显示 AI 总结。']).map((item) => (
                  <div key={item} className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <h3 className="text-lg font-semibold text-zinc-50">趋势预测 & 风险分析</h3>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                  <p className="text-sm font-medium text-cyan-200">趋势预测</p>
                  <p className="mt-2 text-sm leading-7 text-zinc-300">
                    {trendCards[0] || '完成 AI 分析后会生成趋势预测。'}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-sm font-medium text-amber-200">风险分析</p>
                  <p className="mt-2 text-sm leading-7 text-zinc-300">
                    {riskCards[0] || '完成分析后会提示数据风险和注意事项。'}
                  </p>
                </div>
              </div>
            </section>
          </section>
        </motion.aside>

        {/* 右侧 */}
        <main className="space-y-6">
          {error && (
            <div className="rounded-2xl border border-rose-900/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
              ⚠️ {error}
            </div>
          )}

          <section className="panel">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-50">数据概览</h2>
                <p className="mt-1 text-sm text-zinc-500">面向汇报与决策的结构化摘要。</p>
              </div>
              <button className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800">
                导出 PDF
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 shadow-panel">
                <div className="text-3xl font-semibold text-cyan-300">{rows.length}</div>
                <div className="mt-2 text-sm text-zinc-400">总行数</div>
                <div className="mt-4 text-xs text-zinc-500">真实 Excel 解析结果</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 shadow-panel">
                <div className="text-3xl font-semibold text-emerald-300">{columns.length}</div>
                <div className="mt-2 text-sm text-zinc-400">字段数</div>
                <div className="mt-4 text-xs text-zinc-500">自动识别列名</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 shadow-panel">
                <div className="text-3xl font-semibold text-amber-300">{summaryCards.length}</div>
                <div className="mt-2 text-sm text-zinc-400">AI 结论</div>
                <div className="mt-4 text-xs text-zinc-500">DeepSeek 输出</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 shadow-panel">
                <div className="text-3xl font-semibold text-fuchsia-300">{riskCards.length}</div>
                <div className="mt-2 text-sm text-zinc-400">风险项</div>
                <div className="mt-4 text-xs text-zinc-500">自动识别结果</div>
              </div>
            </div>
          </section>

          <section className="panel">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">数据状态</h3>
            <div className="mt-4 space-y-3 text-sm text-zinc-300">
              <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
                <span>当前文件</span>
                <span className="text-zinc-500">{fileName}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
                <span>当前 Sheet</span>
                <span className="text-zinc-500">{sheetName || '--'}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
                <span>分析进度</span>
                <span className="text-cyan-300">{loading ? '进行中' : '0%'}</span>
              </div>
            </div>
          </section>

          {previewRows.length > 0 && (
            <section className="panel overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-50">数据预览</h3>
                  <p className="mt-1 text-sm text-zinc-500">显示前 10 行真实解析结果。</p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-800">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-zinc-950/80 text-zinc-400">
                    <tr>
                      {columns.map((col) => (
                        <th key={col} className="whitespace-nowrap px-4 py-3 font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="border-t border-zinc-800/80 text-zinc-300">
                        {columns.map((col) => (
                          <td key={col} className="whitespace-nowrap px-4 py-3">
                            {String(row[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="grid gap-4 xl:grid-cols-3">
            <div className="panel">
              <h3 className="text-lg font-semibold text-zinc-50">柱状图</h3>
              <div className="mt-4 h-72 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" stroke="#71717a" />
                    <YAxis stroke="#71717a" />
                    <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a' }} />
                    <Bar dataKey="value" fill="#06b6d4" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel">
              <h3 className="text-lg font-semibold text-zinc-50">折线图</h3>
              <div className="mt-4 h-72 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" stroke="#71717a" />
                    <YAxis stroke="#71717a" />
                    <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a' }} />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel">
              <h3 className="text-lg font-semibold text-zinc-50">饼图</h3>
              <div className="mt-4 h-72 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {chartData.pieData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </main>
      </div>
    </WorkspaceShell>
  );
}
