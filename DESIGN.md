# Design

## Overview

蝦米 Workspace 採用 **淺色高科技風格（Aurora Light）**：以極淺的冷灰為底，Indigo → Violet 漸層作為重點色，搭配精細的玻璃效果與發光陰影，營造專業、乾淨、有未來感的生產力工具氛圍。

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#F8FAFC` | 頁面背景 |
| `--surface` | `rgba(255,255,255,0.92)` | 面板背景 |
| `--surface-muted` | `rgba(248,250,252,0.8)` | 次級面板 |
| `--accent` | `#6366F1` | 主要重點色（Indigo） |
| `--accent-violet` | `#8B5CF6` | 輔助重點色（Violet） |
| `--ink` | `#0F172A` | 主要文字 |
| `--ink-secondary` | `#64748B` | 次要文字 |
| `--ink-tertiary` | `#94A3B8` | 輔助文字 |
| `--border` | `rgba(226,232,240,0.8)` | 邊框 |
| `--border-strong` | `rgba(203,213,225,0.9)` | 強邊框 |
| `--success` | `#10B981` | 成功狀態 |
| `--warning` | `#F59E0B` | 警告狀態 |
| `--danger` | `#EF4444` | 危險狀態 |

## Typography

- **Heading**: system-ui / Inter / -apple-system, sans-serif
- **Body**: system-ui / Inter / -apple-system, sans-serif
- **Scale**: 使用 Tailwind 預設 type scale
- **Display letter-spacing**: ≥ -0.04em
- **Body max-width**: 65–75ch

## Spacing

- 4pt base scale：4, 8, 12, 16, 24, 32, 48, 64, 96px
- 使用 `gap` 取代 `margin` 處理兄弟間距
- 容器最大寬度 1600px，內容區 padding 24–32px

## Components

### Panel
- `bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_24px_rgba(0,0,0,0.04)]`
- 卡片用於區分內容群組，不嵌套卡片

### Panel Glass
- `bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(99,102,241,0.08)]`
- 用於強調區塊或懸浮元素

### Button Primary
- 背景：`linear-gradient(135deg, #6366F1, #8B5CF6)`
- 文字白色，font-medium
- 陰影：`0_4px_14px_rgba(99,102,241,0.25)`
- 懸停：陰影增強 + 輕微上移 translateY(-1px)

### Button Ghost
- 透明背景 + `border border-slate-200/80`
- 懸停：`bg-slate-50`

### Badge
- 統一 `.badge` + 語義變體：success/warning/danger/accent/muted
- 圓角 `rounded-full`，小字 `text-xs font-medium`

### Gradient Text
- 僅用於頁面主標題（謹慎使用）
- `from-slate-900 via-indigo-700 to-violet-600`

## Layout Principles

- 使用 Flexbox 處理 1D 排列（按鈕組、列表項）
- 使用 Grid 處理 2D 頁面結構（dashboard、三欄佈局）
- 避免相同大小的卡片無限重複
- 避免嵌套卡片
- 統一 spacing scale，避免任意數值

## Motion

- 使用 Framer Motion 處理入場與狀態切換
- 預設 easing：`ease-out`，duration 0.2–0.3s
- 懸停反饋：scale 1.01 / translateY(-1px) / 陰影增強
- 尊重 `prefers-reduced-motion: reduce`

## Responsive

- 桌面：完整三欄 / 四欄佈局
- 平板：兩欄或堆疊
- 移動：單欄堆疊，按鈕組換行
