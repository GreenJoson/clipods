/**
 * @input  依赖：Vitest, Claude 配置生成器, SessionConfig 类型
 * @output 导出：Claude 配置生成测试
 * @pos    验证 settings.json / claude.json 生成与开关行为
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import { describe, expect, it } from "vitest";
import { buildClaudeJson, buildClaudeSettingsJson } from "../claudeConfig";
import type { SessionConfig } from "../../types/config";

const baseSession: SessionConfig = {
  id: "session-claude",
  name: "Claude Session",
  codexHome: "~/.claude",
  clientType: "claude",
  loginType: "api",
  env: {
    ANTHROPIC_AUTH_TOKEN: "test-token",
    ANTHROPIC_BASE_URL: "https://api.example.com",
    ANTHROPIC_MODEL: "claude-sonnet-4-6",
  },
};

describe("buildClaudeSettingsJson", () => {
  it("returns derived settings with env and model", () => {
    const raw = buildClaudeSettingsJson(baseSession);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw ?? "{}");
    expect(parsed.model).toBe("claude-sonnet-4-6");
    expect(parsed.env.ANTHROPIC_AUTH_TOKEN).toBe("test-token");
    expect(parsed.env.ANTHROPIC_API_KEY).toBe("test-token");
    expect(parsed.env.ANTHROPIC_BASE_URL).toBe("https://api.example.com");
  });

  it("returns null when disabled", () => {
    const raw = buildClaudeSettingsJson({
      ...baseSession,
      claudeSettingsEnabled: false,
    });
    expect(raw).toBeNull();
  });

  it("uses custom json override when provided", () => {
    const raw = buildClaudeSettingsJson({
      ...baseSession,
      claudeSettingsJson: '{"env":{"ANTHROPIC_AUTH_TOKEN":"custom"}}',
    });
    const parsed = JSON.parse(raw ?? "{}");
    expect(parsed.env.ANTHROPIC_AUTH_TOKEN).toBe("custom");
  });
});

describe("buildClaudeJson", () => {
  it("returns null by default when not enabled", () => {
    const raw = buildClaudeJson(baseSession);
    expect(raw).toBeNull();
  });

  it("returns default mcpServers object when enabled", () => {
    const raw = buildClaudeJson({
      ...baseSession,
      claudeJsonEnabled: true,
    });
    expect(JSON.parse(raw ?? "{}")).toEqual({ mcpServers: {} });
  });
});

