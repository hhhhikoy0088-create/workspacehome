# 讯飞 API 申请和配置指南

## 📝 申请步骤

### 1. 注册讯飞账户
- 访问：https://www.xfyun.cn/
- 点击「免费开通」
- 使用邮箱或手机注册

### 2. 创建应用
- 登录 [讯飞控制台](https://console.xfyun.cn/)
- 左侧菜单 → **我的应用**
- 点击 **创建应用**
- 填写应用信息：
  - 应用名称：`会议纪要系统` 或任意名称
  - 应用类型：选择**语音识别**和**NLP**

### 3. 获取密钥
应用创建后，在应用详情页可以看到：
- **APPID** - 应用ID
- **APISecret** - 密钥
- **APIKey** - 密钥

## 🔧 环境变量配置

编辑 `.env.local` 文件，添加以下内容：

```bash
# 讯飞 API 配置
IFLYTEK_APPID=you_appid_from_console
IFLYTEK_API_KEY=your_api_key_from_console
IFLYTEK_API_SECRET=your_api_secret_from_console
```

## 📚 功能说明

### 语音转录（ASR）
- **模型**：讯飞语音识别
- **支持格式**：WebM、MP3、WAV、M4A
- **语言**：中文（优化最好）
- **准确率**：行业顶级
- **价格**：¥0.001-0.002 每秒音频

### 文本分析（NLP）
- **功能**：摘要生成、关键词提取、情感分析
- **处理**：输入转录后的文本
- **输出**：结构化纪要数据
- **价格**：按处理字数计费

## 🚀 使用流程

1. **录音阶段**
   - 点击「开始录音」
   - 讯飞ASR将音频转换为文字

2. **分析阶段**
   - 转录完成后自动调用NLP
   - 生成结构化的会议纪要

3. **导出阶段**
   - 导出为 Word、Markdown 等格式

## ⚠️ 注意事项

1. **免费配额**
   - 讯飞免费账户每月有限配额
   - 查看使用情况：[控制台](https://console.xfyun.cn/system/usage) → 系统使用量

2. **充值方式**
   - 进入控制台 → 我的账户 → 财务管理
   - 选择充值方式（支付宝/微信/银行卡）
   - 支持预付费和按量付费

3. **API 限制**
   - 音频长度限制：60 分钟
   - 文本处理：单次最多 2000 字
   - 并发请求：根据套餐限制

## 🔗 相关链接

- [讯飞官网](https://www.xfyun.cn/)
- [控制台](https://console.xfyun.cn/)
- [API 文档 - 语音识别](https://www.xfyun.cn/doc/asr/voicedictation/API.html)
- [API 文档 - NLP](https://www.xfyun.cn/doc/nlp/nlpcat/API.html)
- [费用说明](https://www.xfyun.cn/pricing)

## 💡 常见问题

**Q: 为什么转录失败？**
A: 检查：
- API 密钥是否正确输入
- 音频格式是否支持
- 音频质量是否足够清晰

**Q: 如何查看使用量？**
A: 进入[讯飞控制台](https://console.xfyun.cn/) → 系统使用量

**Q: 支持离线使用吗？**
A: 讯飞SDK支持离线语音识别，但这里使用的是云端API，需要网络连接。

**Q: 能否切换其他服务商？**
A: 可以，代码已设计为可替换的API接口。
