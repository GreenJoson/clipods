/**
 * @input  依赖：SessionConfig/AuthAccount 类型
 * @output 导出：account binding 解析器（有效登录方式、环境变量与 auth 投影）
 * @pos    支持会话绑定可复用账号的纯逻辑层，供 App 在写入 auth/env 时复用
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import type { AuthAccount, SessionAuthType, SessionConfig } from "../types/config";

export type AccountAuthPayload =
  | { kind: "chatgpt"; accountId: string; json: string }
  | { kind: "api"; apiKey: string };

export interface AccountBindingResult {
  loginType: SessionAuthType;
  env: Record<string, string>;
  authPayload?: AccountAuthPayload;
  account?: AuthAccount;
}

const CHATGPT_SANITIZE_KEYS = new Set([
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OPENAI_MODEL",
  "OPENAI_ORGANIZATION",
  "OPENAI_PROJECT",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_MODEL",
]);

const sanitizeForChatGPT = (env: Record<string, string>): Record<string, string> => {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (!value.trim() || CHATGPT_SANITIZE_KEYS.has(key)) {
      continue;
    }
    output[key] = value;
  }
  return output;
};

const injectCodexApiFields = (
  env: Record<string, string>,
  account: Extract<AuthAccount, { type: "api" }>
): Record<string, string> => {
  const next: Record<string, string> = { ...env, OPENAI_API_KEY: account.apiKey };

  if (account.baseUrl?.trim()) {
    next.OPENAI_BASE_URL = account.baseUrl.trim();
  }
  if (account.model?.trim()) {
    next.OPENAI_MODEL = account.model.trim();
  }
  if (account.organization?.trim()) {
    next.OPENAI_ORGANIZATION = account.organization.trim();
  }
  if (account.project?.trim()) {
    next.OPENAI_PROJECT = account.project.trim();
  }

  return next;
};

const injectClaudeApiFields = (
  env: Record<string, string>,
  account: Extract<AuthAccount, { type: "api" }>
): Record<string, string> => {
  const next: Record<string, string> = {
    ...env,
    ANTHROPIC_AUTH_TOKEN: account.apiKey,
    ANTHROPIC_API_KEY: account.apiKey,
  };

  if (account.baseUrl?.trim()) {
    next.ANTHROPIC_BASE_URL = account.baseUrl.trim();
  }
  if (account.model?.trim()) {
    next.ANTHROPIC_MODEL = account.model.trim();
  }

  return next;
};

const resolveEffectiveLoginType = (
  session: SessionConfig,
  account?: AuthAccount
): SessionAuthType => account?.type ?? session.loginType;

export const resolveAccountBinding = (
  session: SessionConfig,
  account?: AuthAccount
): AccountBindingResult => {
  const loginType = resolveEffectiveLoginType(session, account);
  const baseEnv = { ...(session.env ?? {}) };
  let env = loginType === "chatgpt" ? sanitizeForChatGPT(baseEnv) : baseEnv;

  if (account?.type === "api") {
    env =
      (session.clientType ?? "codex") === "claude"
        ? injectClaudeApiFields(env, account)
        : injectCodexApiFields(env, account);
  }

  const authPayload =
    account?.type === "chatgpt"
      ? {
          kind: "chatgpt" as const,
          accountId: account.id,
          json: account.authJson,
        }
      : (session.clientType ?? "codex") === "codex" &&
          loginType === "api" &&
          env.OPENAI_API_KEY?.trim()
        ? {
            kind: "api" as const,
            apiKey: env.OPENAI_API_KEY.trim(),
          }
        : undefined;

  return {
    loginType,
    env,
    authPayload,
    account,
  };
};
