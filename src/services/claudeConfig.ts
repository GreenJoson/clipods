/**
 * @input  依赖：SessionConfig 类型
 * @output 导出：Claude settings.json / claude.json 生成器
 * @pos    会话配置到 Claude 配置文件的转换层（含 ccswitch 风格 env 字段兼容）
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import type { SessionConfig } from "../types/config";

type JsonObject = Record<string, unknown>;

const getEnv = (session: SessionConfig, key: string): string =>
  (session.env?.[key] ?? "").trim();

const parseJsonObject = (raw: string): JsonObject => {
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON must be an object");
  }
  return parsed as JsonObject;
};

export const buildClaudeSettingsJson = (session: SessionConfig): string | null => {
  if ((session.clientType ?? "codex") !== "claude") {
    return null;
  }
  if (session.claudeSettingsEnabled === false) {
    return null;
  }

  const custom = session.claudeSettingsJson?.trim();
  if (custom) {
    return JSON.stringify(parseJsonObject(custom), null, 2);
  }

  const token = getEnv(session, "ANTHROPIC_AUTH_TOKEN") || getEnv(session, "ANTHROPIC_API_KEY");
  const baseUrl = getEnv(session, "ANTHROPIC_BASE_URL");
  const model = getEnv(session, "ANTHROPIC_MODEL");

  const env: Record<string, string> = {};
  if (token) {
    env.ANTHROPIC_AUTH_TOKEN = token;
    env.ANTHROPIC_API_KEY = token;
  }
  if (baseUrl) {
    env.ANTHROPIC_BASE_URL = baseUrl;
  }
  if (model) {
    env.ANTHROPIC_MODEL = model;
  }

  const settings: JsonObject = {};
  if (Object.keys(env).length > 0) {
    settings.env = env;
  }
  if (model) {
    settings.model = model;
  }

  if (Object.keys(settings).length === 0) {
    return null;
  }
  return JSON.stringify(settings, null, 2);
};

export const buildClaudeJson = (session: SessionConfig): string | null => {
  if ((session.clientType ?? "codex") !== "claude") {
    return null;
  }
  if (!session.claudeJsonEnabled) {
    return null;
  }

  const custom = session.claudeJson?.trim();
  if (custom) {
    return JSON.stringify(parseJsonObject(custom), null, 2);
  }

  return JSON.stringify({ mcpServers: {} }, null, 2);
};

