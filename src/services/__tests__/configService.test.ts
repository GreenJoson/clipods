/**
 * @input  依赖：Vitest, configService, config 类型
 * @output 导出：configService TOML round-trip 与配置隔离路径测试
 * @pos    配置服务的序列化/反序列化、账号池回环、隔离路径与 legacy 回退验证
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import { describe, expect, it } from "vitest";
import { createConfigService, parseConfig, serializeConfig } from "../configService";
import type { AppConfig } from "../../types/config";

const sampleConfig: AppConfig = {
  version: 1,
  defaultSessionId: "session-1",
  sessions: [
    {
      id: "session-1",
      name: "Primary",
      codexHome: "/Users/evalove/.codex",
      clientType: "codex",
      loginType: "chatgpt",
      terminalProfileId: "terminal-default",
      ideProfileId: "ide-vscode",
      boundAccountId: "account-chatgpt",
      launchCommand: "codex resume 123",
      extraConfigToml: "model_provider = \"custom\"",
      env: {
        CODEX_ENV: "prod",
      },
    },
  ],
  terminalProfiles: [
    {
      id: "terminal-default",
      name: "Terminal",
      command: "zsh",
      args: ["-l"],
      env: {
        LANG: "en_US.UTF-8",
      },
    },
  ],
  ideProfiles: [
    {
      id: "ide-vscode",
      name: "VS Code",
      command: "code",
      args: ["--reuse-window"],
    },
  ],
  accounts: [
    {
      id: "account-chatgpt",
      name: "Main ChatGPT",
      type: "chatgpt",
      authJson: "{\"tokens\":{\"access_token\":\"at\"}}",
    },
    {
      id: "account-api",
      name: "Proxy API",
      type: "api",
      apiKey: "sk-test",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-5.1-codex",
      organization: "org_demo",
      project: "proj_demo",
    },
  ],
};

describe("configService", () => {
  it("round-trips config via TOML", () => {
    const serialized = serializeConfig(sampleConfig);
    const parsed = parseConfig(serialized);

    expect(parsed).toEqual(sampleConfig);
  });

  it("ignores invalid account entries during parse", () => {
    const parsed = parseConfig(`
version = 1

[[accounts]]
id = "good-chatgpt"
name = "Good ChatGPT"
type = "chatgpt"
authJson = "{}"

[[accounts]]
id = "missing-name"
type = "chatgpt"
authJson = "{}"

[[accounts]]
id = "missing-payload"
name = "Bad API"
type = "api"

[[accounts]]
id = "compat"
label = "Compat API"
type = "api-key"
apiKey = "sk-compat"
`);

    expect(parsed.accounts).toEqual([
      {
        id: "good-chatgpt",
        name: "Good ChatGPT",
        type: "chatgpt",
        authJson: "{}",
      },
      {
        id: "compat",
        name: "Compat API",
        type: "api",
        apiKey: "sk-compat",
      },
    ]);
  });

  it("returns default config when load fails", async () => {
    const service = createConfigService(
      {
        readTextFile: async () => {
          throw new Error("missing");
        },
        writeTextFile: async () => undefined,
        ensureDir: async () => undefined,
      },
      {
        getAppConfigDir: async () => "/tmp",
      }
    );

    const config = await service.load();

    expect(config).toEqual({
      version: 1,
      sessions: [],
      terminalProfiles: [],
      ideProfiles: [],
      accounts: [],
    });
  });

  it("uses isolated config file path for claude scope", async () => {
    const reads: string[] = [];
    const writes: Array<{ path: string; contents: string }> = [];
    const service = createConfigService(
      {
        readTextFile: async (path: string) => {
          reads.push(path);
          throw new Error("missing");
        },
        writeTextFile: async (path: string, contents: string) => {
          writes.push({ path, contents });
        },
        ensureDir: async () => undefined,
      },
      {
        getAppConfigDir: async () => "/tmp/clipods",
      },
      {
        scope: "claude",
      }
    );

    await service.load();
    await service.save(sampleConfig);

    expect(reads[0]).toBe("/tmp/clipods/config.claude.toml");
    expect(writes[0]?.path).toBe("/tmp/clipods/config.claude.toml");
  });

  it("falls back to legacy config.toml for codex scope when scoped file missing", async () => {
    const reads: string[] = [];
    const legacy = serializeConfig(sampleConfig);
    const service = createConfigService(
      {
        readTextFile: async (path: string) => {
          reads.push(path);
          if (path.endsWith("/config.codex.toml")) {
            throw new Error("missing scoped");
          }
          if (path.endsWith("/config.toml")) {
            return legacy;
          }
          throw new Error(`unexpected path ${path}`);
        },
        writeTextFile: async () => undefined,
        ensureDir: async () => undefined,
      },
      {
        getAppConfigDir: async () => "/tmp/clipods",
      },
      {
        scope: "codex",
      }
    );

    const loaded = await service.load();

    expect(reads).toEqual([
      "/tmp/clipods/config.codex.toml",
      "/tmp/clipods/config.toml",
    ]);
    expect(loaded).toEqual(sampleConfig);
  });
});
