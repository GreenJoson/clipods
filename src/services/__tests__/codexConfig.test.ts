/**
 * @input  依赖：vitest, buildCodexConfig
 * @output 导出：Codex 配置生成测试
 * @pos    校验会话到 config.toml 的核心映射（含新 feature 默认值）
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import { describe, expect, it } from "vitest";
import { buildCodexConfig } from "../codexConfig";
import type { SessionConfig } from "../../types/config";

const baseSession: SessionConfig = {
  id: "session-1",
  name: "Test",
  codexHome: "~/.codex",
  loginType: "chatgpt",
};

describe("buildCodexConfig", () => {
  it("writes minimal chatgpt config", () => {
    const output = buildCodexConfig({ ...baseSession, loginType: "chatgpt" });

    expect(output).toContain('forced_login_method = "chatgpt"');
    expect(output).toContain('model_provider = "openai"');
    expect(output).not.toContain("env_key");
    expect(output).not.toContain("[model_providers.openai]");
  });

  it("writes api config with model and provider settings", () => {
    const output = buildCodexConfig({
      ...baseSession,
      loginType: "api",
      env: {
        OPENAI_API_KEY: "sk-test",
        OPENAI_BASE_URL: "https://api.openai.com/v1",
        OPENAI_MODEL: "gpt-5.3-codex",
        OPENAI_ORGANIZATION: "org_123",
        OPENAI_PROJECT: "proj_456",
      },
    });

    expect(output).toContain('forced_login_method = "api"');
    expect(output).toContain('model = "gpt-5.3-codex"');
    expect(output).toContain('model_provider = "custom"');
    expect(output).toContain("[model_providers.custom]");
    expect(output).toContain('name = "custom"');
    expect(output).toContain('wire_api = "responses"');
    expect(output).toContain("requires_openai_auth = false");
    expect(output).toContain('base_url = "https://api.openai.com/v1"');
    expect(output).toContain("[features]");
    expect(output).toContain("multi_agent = true");
    expect(output).toContain("unified_exec = true");
    expect(output).toContain("shell_snapshot = true");
    expect(output).not.toContain("collab = true");
    expect(output).not.toContain("collaboration_modes = true");
    expect(output).not.toContain("steer = true");
    expect(output).not.toContain("env_key");
  });

  it("adds provider block for api even without base url", () => {
    const output = buildCodexConfig({
      ...baseSession,
      loginType: "api",
      env: {
        OPENAI_API_KEY: "sk-test",
      },
    });

    expect(output).toContain("[model_providers.openai]");
    expect(output).toContain('name = "openai"');
    expect(output).toContain('env_key = "OPENAI_API_KEY"');
    expect(output).not.toContain("base_url =");
    expect(output).toContain("[features]");
    expect(output).toContain("multi_agent = true");
    expect(output).not.toContain("collab = true");
  });

  it("does not inject default features when extra config already defines features", () => {
    const output = buildCodexConfig({
      ...baseSession,
      loginType: "api",
      env: {
        OPENAI_API_KEY: "sk-test",
      },
      extraConfigToml: "[features]\nmulti_agent = false\nshell_snapshot = false",
    });

    const featureHeaderCount = (output.match(/\[features\]/gu) ?? []).length;
    expect(featureHeaderCount).toBe(1);
    expect(output).toContain("multi_agent = false");
    expect(output).toContain("shell_snapshot = false");
  });

  it("appends extra config toml at the end", () => {
    const output = buildCodexConfig({
      ...baseSession,
      extraConfigToml: "[features]\nmulti_agent = true",
    });

    expect(output).toContain("# --- extra config (appended) ---");
    expect(output).toContain("[features]\nmulti_agent = true");
  });
});
