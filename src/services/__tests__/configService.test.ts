/**
 * @input  依赖：Vitest, configService, config 类型
 * @output 导出：configService TOML round-trip 测试
 * @pos    配置服务的序列化/反序列化验证
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
      loginType: "chatgpt",
      terminalProfileId: "terminal-default",
      ideProfileId: "ide-vscode",
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
};

describe("configService", () => {
  it("round-trips config via TOML", () => {
    const serialized = serializeConfig(sampleConfig);
    const parsed = parseConfig(serialized);

    expect(parsed).toEqual(sampleConfig);
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
    });
  });
});
