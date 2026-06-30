require('dotenv').config();

/**
 * 集中管理所有第三方 API 密钥
 * 方案 B: 后端环理所有密钥，前端通过后端代理访问
 */

class APIKeyManager {
  constructor() {
    this.validateEnv();
  }

  /**
   * 验证环境变量完整性
   */
  validateEnv() {
    const required = {
      // DeepSeek API
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
      DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',

      // 邮件配置
      MAIL_PROVIDER: process.env.MAIL_PROVIDER || 'gmail',
      MAIL_USER: process.env.MAIL_USER,
      MAIL_PASS: process.env.MAIL_PASS,
      MAIL_FROM: process.env.MAIL_FROM || process.env.MAIL_USER,

      // 数据库
      DATABASE_PATH: process.env.DATABASE_PATH || './workspace.db',

      // 服务配置
      PORT: process.env.PORT || 3001,
      NODE_ENV: process.env.NODE_ENV || 'development'
    };

    const missing = [];
    for (const [key, value] of Object.entries(required)) {
      if (!value && ['DEEPSEEK_API_KEY', 'MAIL_USER', 'MAIL_PASS'].includes(key)) {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      console.warn(`[WARNING] 缺少的环境变量: ${missing.join(', ')}`);
    }

    this.config = required;
  }

  /**
   * 获取 DeepSeek 配置
   */
  getDeepSeekConfig() {
    return {
      apiKey: this.config.DEEPSEEK_API_KEY,
      baseUrl: this.config.DEEPSEEK_BASE_URL,
      model: this.config.DEEPSEEK_MODEL
    };
  }

  /**
   * 获取邮件配置
   */
  getMailConfig() {
    return {
      provider: this.config.MAIL_PROVIDER,
      user: this.config.MAIL_USER,
      pass: this.config.MAIL_PASS,
      from: this.config.MAIL_FROM
    };
  }

  /**
   * 获取所有配置（不包含敏感信息）
   */
  getPublicConfig() {
    return {
      deepseek: {
        baseUrl: this.config.DEEPSEEK_BASE_URL,
        model: this.config.DEEPSEEK_MODEL,
        configured: Boolean(this.config.DEEPSEEK_API_KEY)
      },
      mail: {
        provider: this.config.MAIL_PROVIDER,
        configured: Boolean(this.config.MAIL_USER)
      },
      env: this.config.NODE_ENV
    };
  }

  /**
   * 验证 DeepSeek API 密钥有效性
   */
  async validateDeepSeekKey() {
    try {
      const config = this.getDeepSeekConfig();
      if (!config.apiKey) return { valid: false, error: 'API Key not configured' };

      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10
        })
      });

      if (response.ok) {
        return { valid: true };
      } else {
        const text = await response.text();
        return { valid: false, error: `HTTP ${response.status}: ${text}` };
      }
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

module.exports = new APIKeyManager();
