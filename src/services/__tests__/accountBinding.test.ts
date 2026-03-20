/**
 * @input  依赖：Vitest, accountBinding, 配置类型
 * @output 导出：账号绑定解析测试
 * @pos    验证会话原生认证与绑定账号认证的投影逻辑
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import { describe, expect, it } from "vitest";
import type { ApiAccount, ChatGPTAccount, SessionConfig } from "../../types/config";
import { resolveAccountBinding } from "../accountBinding";

describe("account binding helper", () => {
  const baseSession: SessionConfig = {
    id: "session-1",
    name: "Primary",
    codexHome: "/tmp/.codex",
    loginType: "chatgpt",
  };

  it("preserves legacy chatgpt session behavior without bound account", () => {
    const result = resolveAccountBinding({
      ...baseSession,
      env: {
        KEEP_ME: "1",
        OPENAI_API_KEY: "sk-legacy",
      },
    });

    expect(result.loginType).toBe("chatgpt");
    expect(result.authPayload).toBeUndefined();
    expect(result.env).toEqual({
      KEEP_ME: "1",
    });
  });

  it("preserves legacy api session behavior without bound account", () => {
    const result = resolveAccountBinding({
      ...baseSession,
      loginType: "api",
      env: {
        OPENAI_API_KEY: "sk-session",
        OPENAI_MODEL: "gpt-5.1-codex",
      },
    });

    expect(result.loginType).toBe("api");
    expect(result.authPayload).toEqual({
      kind: "api",
      apiKey: "sk-session",
    });
    expect(result.env).toEqual({
      OPENAI_API_KEY: "sk-session",
      OPENAI_MODEL: "gpt-5.1-codex",
    });
  });

  it("binds a ChatGPT account and returns the auth payload", () => {
    const account: ChatGPTAccount = {
      id: "acct-1",
      name: "Main ChatGPT",
      type: "chatgpt",
      authJson: JSON.stringify({ tokens: { access_token: "at" } }),
    };

    const result = resolveAccountBinding(
      {
        ...baseSession,
        loginType: "api",
        env: { OPENAI_API_KEY: "sk-legacy", KEEP_ME: "yes" },
      },
      account
    );

    expect(result.loginType).toBe("chatgpt");
    expect(result.authPayload).toEqual({
      kind: "chatgpt",
      accountId: "acct-1",
      json: account.authJson,
    });
    expect(result.env).toEqual({
      KEEP_ME: "yes",
    });
  });

  it("binds an API account and exposes key in env and payload", () => {
    const account: ApiAccount = {
      id: "api-1",
      name: "Proxy Account",
      type: "api",
      apiKey: "sk-test",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-6",
      organization: "org",
      project: "proj",
    };

    const result = resolveAccountBinding(
      { ...baseSession, env: { EXTRA: "keep" } },
      account
    );

    expect(result.loginType).toBe("api");
    expect(result.authPayload).toEqual({ kind: "api", apiKey: "sk-test" });
    expect(result.env).toEqual({
      EXTRA: "keep",
      OPENAI_API_KEY: "sk-test",
      OPENAI_BASE_URL: "https://api.openai.com/v1",
      OPENAI_MODEL: "gpt-6",
      OPENAI_ORGANIZATION: "org",
      OPENAI_PROJECT: "proj",
    });
  });

  it("binds an API account for claude sessions via anthropic env", () => {
    const account: ApiAccount = {
      id: "claude-api",
      name: "Claude API",
      type: "api",
      apiKey: "sk-ant",
      baseUrl: "https://api.anthropic.com",
      model: "claude-sonnet-4-20250514",
    };

    const result = resolveAccountBinding(
      {
        ...baseSession,
        clientType: "claude",
        loginType: "api",
        env: { EXTRA: "keep" },
      },
      account
    );

    expect(result.loginType).toBe("api");
    expect(result.authPayload).toBeUndefined();
    expect(result.env).toEqual({
      EXTRA: "keep",
      ANTHROPIC_AUTH_TOKEN: "sk-ant",
      ANTHROPIC_API_KEY: "sk-ant",
      ANTHROPIC_BASE_URL: "https://api.anthropic.com",
      ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
    });
  });
});
