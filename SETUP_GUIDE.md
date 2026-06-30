# AI 会议纪要模块 - 快速开始指南

## 🚀 快速启动

### 1. 安装依赖
```bash
npm install
# 或
yarn install
```

### 2. 配置环境变量

在项目根目录创建或更新 `.env.local` 文件：

```env
# OpenAI API - 用于 Whisper 语音转录
OPENAI_API_KEY=sk-your-openai-api-key-here

# DeepSeek API - 用于 AI 纪要生成
DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here
```

**获取 API Key：**
- **OpenAI**: https://platform.openai.com/api-keys
- **DeepSeek**: https://platform.deepseek.com/api-keys

### 3. 运行开发服务器

```bash
npm run dev
# 或
yarn dev
```

访问：http://localhost:3000/meeting

---

## 📋 功能清单（14/14 完成）

### ✅ 基础功能
- [x] 页面拥有开始录音按钮
- [x] 使用浏览器 MediaRecorder API 录音
- [x] 支持暂停、继续、结束录音
- [x] 录音结束以后自动生成 webm 文件

### ✅ API 集成
- [x] POST 到 `/api/meeting/transcribe`
- [x] 后端调用 OpenAI Whisper API
- [x] 返回完整文字
- [x] 再调用 `/api/meeting/summary`
- [x] 使用 DeepSeek API 生成纪要

### ✅ 纪要内容
- [x] 会议摘要
- [x] 讨论重点
- [x] 决策事项
- [x] 待办事项（含负责人）
- [x] 截止时间
- [x] AI 建议

### ✅ 页面布局
- [x] 左边显示会议全文
- [x] 右边显示 AI 生成纪要

### ✅ 导出功能
- [x] 导出 Markdown
- [x] 导出 Word

### ✅ 用户交互
- [x] 支持重新录音
- [x] 支持上传 mp3 wav m4a webm 文件识别
- [x] 增加加载动画、错误提示、上传进度

### ✅ 代码质量
- [x] 所有代码采用 TypeScript
- [x] 所有 API 写在 app/api
- [x] 组件拆分
- [x] 代码规范
- [x] UI 保持与整个 Shrimp AI 深色科技风一致

---

## 📂 项目结构

```
src/
├── app/
│   ├── api/
│   │   └── meeting/
│   │       ├── transcribe/
│   │       │   └── route.ts        ✅ Whisper API (语音转文字)
│   │       └── summary/
│   │           └── route.ts        ✅ DeepSeek API (生成纪要)
│   └── meeting/
│       └── page.tsx                ✅ 主页面（完整功能）
│
└── components/
    └── meeting/
        ├── Recorder.tsx            ✅ 实时录音组件
        ├── FileUploader.tsx        ✅ 文件上传组件
        ├── Transcript.tsx          ✅ 会议全文显示
        ├── Summary.tsx             ✅ AI 纪要展示
        └── ExportTools.tsx         ✅ 导出工具
```

---

## 🎯 三种使用模式

### 模式 1: 实时录音 🎤
```
1. 点击"开始录音"按钮
2. 允许浏览器访问麦克风
3. 进行会议（支持暂停/继续）
4. 点击"停止"结束录音
5. 自动转录并生成纪要
```

### 模式 2: 上传文件 📁
```
1. 点击"上传文件"tab
2. 拖拽或点击选择音频文件
3. 支持格式：MP3、WAV、M4A、WebM
4. 自动上传转录
5. 显示结果
```

### 模式 3: 输入文字 📝
```
1. 点击"输入文字"tab
2. 粘贴会议记录或笔记
3. 点击"生成纪要"按钮
4. 直接生成AI纪要
```

---

## 🔧 API 接口详解

### 1. 语音转录 API
**端点**: `POST /api/meeting/transcribe`

**请求**:
```javascript
const formData = new FormData();
formData.append('file', audioBlob); // 音频文件

fetch('/api/meeting/transcribe', {
  method: 'POST',
  body: formData
});
```

**响应成功** (200):
```json
{
  "text": "今天我们主要讨论了项目的进度...",
  "success": true
}
```

**响应错误** (400/500):
```json
{
  "error": "转录失败或不支持的格式",
  "code": 400
}
```

**模型**: OpenAI Whisper-1  
**语言**: 中文 (zh)  
**支持格式**: MP3、WAV、M4A、WebM

---

### 2. 纪要生成 API
**端点**: `POST /api/meeting/summary`

**请求**:
```javascript
fetch('/api/meeting/summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fullText: "会议转录文本内容..."
  })
});
```

**响应成功** (200):
```json
{
  "summary": "本次会议主要讨论了项目第一阶段的进度...",
  "keyPoints": [
    "功能开发进度已完成60%",
    "下周进行设计评审",
    "成本预算需调整"
  ],
  "decisions": [
    "同意推迟发布时间至3月底",
    "批准增加2名开发人员"
  ],
  "actionItems": [
    {
      "task": "完成UI设计稿",
      "owner": "张三",
      "deadline": "本周五"
    },
    {
      "task": "搭建测试环境",
      "owner": "李四",
      "deadline": "下周一"
    }
  ],
  "teamMembers": ["张三", "李四", "王五"],
  "timeline": "下周二下午2点进行设计评审",
  "suggestions": [
    "建议提前准备测试用例",
    "及时同步进度到项目管理系统"
  ],
  "success": true
}
```

**模型**: DeepSeek Chat  
**特性**: 结构化输出、中文理解优化

---

## 🎨 UI 组件说明

### Recorder.tsx
实时录音组件，提供：
- ⏱️ 实时计时显示（mm:ss）
- 🎤 开始/暂停/继续/停止按钮
- 🔴 录音状态指示
- ⚠️ 错误提示

### FileUploader.tsx
文件上传组件，提供：
- 🎯 拖拽上传区域
- 📊 上传进度条
- ✅ 文件类型验证
- 💾 支持多种音频格式

### Transcript.tsx
会议全文组件，提供：
- 📄 全文显示
- 🔄 加载骨架屏
- 📜 自动滚动
- 🔍 文本预格式化

### Summary.tsx
AI纪要组件，提供：
- 📋 摘要展示
- 💡 重点讨论
- ✓ 决策事项
- 📝 待办事项（彩色标签）
- 👥 参与人员
- ⏱️ 时间节点
- 🎯 AI建议

### ExportTools.tsx
导出工具组件，提供：
- 📝 导出 Markdown (.md)
- 📄 导出 Word (.doc)
- 🔄 支持重新开始

---

## 🐛 常见问题解决

### Q1: 无法访问麦克风
**问题**: "无法访问麦克风，请检查权限设置"

**解决**:
1. 检查浏览器权限
2. 允许该网站访问麦克风
3. 使用 HTTPS（生产环境）
4. 尝试不同浏览器

### Q2: Whisper API 调用失败
**问题**: 转录失败

**检查清单**:
- [ ] `OPENAI_API_KEY` 已设置
- [ ] API Key 有效且未过期
- [ ] 账户有足够的使用额度
- [ ] 网络连接正常
- [ ] 音频文件格式正确

### Q3: DeepSeek API 调用失败
**问题**: 生成纪要失败

**检查清单**:
- [ ] `DEEPSEEK_API_KEY` 已设置
- [ ] API Key 有效
- [ ] 输入文本不为空
- [ ] 网络连接正常

### Q4: 文件上传失败
**问题**: 无法上传音频文件

**可能原因**:
- 文件格式不支持（必须是 MP3/WAV/M4A/WebM）
- 文件过大（建议 < 50MB）
- 网络连接中断

### Q5: 录音效果不好
**问题**: 转录准确度低

**改进建议**:
- 确保环境安静
- 避免背景噪音
- 说话速度正常
- 避免方言或口音
- 清晰地发音

---

## 📊 数据流

```
用户输入
    ↓
┌───────────────┐
│ 实时录音 📁上传 📝输入 │
└───────────────┘
    ↓
生成 WebM/上传文件/获取文本
    ↓
POST /api/meeting/transcribe
    ↓
Whisper API 转录
    ↓
获得完整文本
    ↓
POST /api/meeting/summary
    ↓
DeepSeek API 分析
    ↓
返回结构化纪要
    ↓
┌──────────────────┐
│ 左: 会议全文      │
│ 右: AI 纪要       │
└──────────────────┘
    ↓
导出 MD/Word
```

---

## 🚀 生产部署

### 环境变量检查
```bash
# 确保这些在生产环境已配置
OPENAI_API_KEY=xxx
DEEPSEEK_API_KEY=xxx
```

### 性能优化
- ✅ 组件懒加载
- ✅ 虚拟滚动（长文本）
- ✅ 流式传输支持

### 安全性
- ✅ 文件类型验证
- ✅ API Key 环境变量管理
- ✅ 错误信息脱敏

---

## 📈 使用统计

通过访问 `/meeting` 页面，你可以：
- 📊 记录会议数量
- ⏱️ 统计转录总时长
- 📄 跟踪生成的纪要数

---

## 🔮 未来功能展望

- [ ] PDF 导出
- [ ] 实时转录预览
- [ ] 说话人识别
- [ ] 多语言支持
- [ ] 本地历史记录
- [ ] 邮件分享
- [ ] 会议统计分析

---

## 💬 技术支持

如遇到问题：

1. **查看控制台错误**
   ```javascript
   // 浏览器开发者工具 → Console 标签
   ```

2. **检查服务器日志**
   ```bash
   # 终端输出
   npm run dev
   ```

3. **验证 API 配置**
   ```bash
   echo $OPENAI_API_KEY
   echo $DEEPSEEK_API_KEY
   ```

---

## ✨ 代码示例

### 在组件中调用
```tsx
import MeetingRecorder from '@/components/meeting/Recorder';

export function MyComponent() {
  const handleRecordComplete = async (audioBlob: Blob) => {
    // 音频处理逻辑
  };

  return (
    <MeetingRecorder onRecordComplete={handleRecordComplete} />
  );
}
```

### 手动调用 API
```typescript
// 转录
const transcribeResponse = await fetch('/api/meeting/transcribe', {
  method: 'POST',
  body: formData
});

// 生成纪要
const summaryResponse = await fetch('/api/meeting/summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fullText })
});
```

---

**最后更新**: 2024年  
**版本**: 1.0.0  
**技术栈**: Next.js 15 + React + TypeScript + TailwindCSS  
**API 提供商**: OpenAI + DeepSeek
