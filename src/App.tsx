/**
 * @input  依赖：React, Tauri API, 配置服务, UI 组件
 * @output 导出：App 组件
 * @pos    启动器 UI 主入口与状态协调
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { appConfigDir } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import "./App.css";
import SegmentTabs from "./components/SegmentTabs";
import Toolbar from "./components/Toolbar";
import EmptyState from "./components/EmptyState";
import SessionBoard from "./blocks/SessionBoard";
import { createConfigService, parseConfig, serializeConfig } from "./services/configService";
import type { AppConfig, IdeProfile, SessionConfig } from "./types/config";

const EMPTY_CONFIG: AppConfig = {
  version: 1,
  sessions: [],
  terminalProfiles: [],
  ideProfiles: [],
};

const App = () => {
  const [config, setConfig] = useState<AppConfig>(EMPTY_CONFIG);
  const [activeTab, setActiveTab] = useState("sessions");
  const [searchValue, setSearchValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fileClient = useMemo(
    () => ({
      readTextFile: (path: string) => readTextFile(path),
      writeTextFile: (path: string, contents: string) =>
        writeTextFile(path, contents),
      ensureDir: (path: string) => mkdir(path, { recursive: true }),
    }),
    []
  );

  const pathProvider = useMemo(
    () => ({
      getAppConfigDir: async () => appConfigDir(),
    }),
    []
  );

  const configService = useMemo(
    () => createConfigService(fileClient, pathProvider),
    [fileClient, pathProvider]
  );

  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      const loaded = await configService.load();
      if (mounted) {
        setConfig(loaded);
        setLoading(false);
      }
    };

    loadConfig().catch(() => {
      if (mounted) {
        setConfig(EMPTY_CONFIG);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [configService]);

  useEffect(() => {
    if (!status) {
      return undefined;
    }
    const timer = window.setTimeout(() => setStatus(null), 2600);
    return () => window.clearTimeout(timer);
  }, [status]);

  const filteredSessions = useMemo(() => {
    if (!searchValue) {
      return config.sessions;
    }
    const keyword = searchValue.toLowerCase();
    return config.sessions.filter(
      (session) =>
        session.name.toLowerCase().includes(keyword) ||
        session.codexHome.toLowerCase().includes(keyword)
    );
  }, [config.sessions, searchValue]);

  const tabs = [
    { id: "sessions", label: "会话", count: config.sessions.length },
    { id: "terminals", label: "终端", count: config.terminalProfiles.length },
    { id: "ides", label: "IDE", count: config.ideProfiles.length },
  ];

  const handleCreateSession = async () => {
    const id = `session-${Date.now()}`;
    const next: AppConfig = {
      ...config,
      sessions: [
        ...config.sessions,
        {
          id,
          name: `新会话 ${config.sessions.length + 1}`,
          codexHome: "~/.codex",
          loginType: "chatgpt",
        },
      ],
      defaultSessionId: config.defaultSessionId ?? id,
    };
    setConfig(next);
    await configService.save(next);
    setStatus("已创建会话");
  };

  const handleLaunchTerminal = async (session: SessionConfig) => {
    await invoke("launch_terminal", { workingDir: session.codexHome });
    setStatus("终端已打开");
  };

  const handleLaunchIde = async (session: SessionConfig, profile?: IdeProfile) => {
    await invoke("launch_ide", {
      app: profile?.command ?? "Visual Studio Code",
      targetPath: session.codexHome,
    });
    setStatus("IDE 已打开");
  };

  const handleEnsureHome = async (session: SessionConfig) => {
    await invoke("ensure_codex_home", { path: session.codexHome });
    setStatus("登录准备完成");
  };

  const handleRevealHome = async (session: SessionConfig) => {
    await invoke("reveal_path", { path: session.codexHome });
  };

  const handleRevealConfig = async () => {
    const configPath = await configService.getConfigPath();
    await invoke("reveal_path", { path: configPath });
  };

  const handleImport = async () => {
    const selected = await open({
      filters: [{ name: "TOML", extensions: ["toml"] }],
      multiple: false,
    });
    if (!selected || Array.isArray(selected)) {
      return;
    }
    const contents = await readTextFile(selected);
    const parsed = parseConfig(contents);
    setConfig(parsed);
    await configService.save(parsed);
    setStatus("导入完成");
  };

  const handleExport = async () => {
    const target = await save({
      defaultPath: "codex-launcher.toml",
      filters: [{ name: "TOML", extensions: ["toml"] }],
    });
    if (!target) {
      return;
    }
    await writeTextFile(target, serializeConfig(config));
    setStatus("导出完成");
  };

  return (
    <div className="app-shell">
      <header className="topbar surface motion-rise-in">
        <div className="brand">
          <div className="brand-badge">C</div>
          <div className="brand-copy">
            <span className="brand-title">Codex Switch</span>
            <span className="brand-subtitle">多会话启动器</span>
          </div>
        </div>
        <SegmentTabs items={tabs} activeId={activeTab} onChange={setActiveTab} />
        <div className="top-actions">
          {status ? <span className="top-status">{status}</span> : null}
          <button type="button" className="btn btn-ghost" onClick={handleRevealConfig}>
            配置目录
          </button>
        </div>
      </header>

      <main className="content">
        <Toolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          totalCount={config.sessions.length}
          filteredCount={filteredSessions.length}
          onImport={handleImport}
          onExport={handleExport}
          onCreateSession={handleCreateSession}
          onRevealConfig={handleRevealConfig}
        />

        {loading ? (
          <EmptyState title="加载中" description="正在读取配置…" />
        ) : null}

        {!loading && activeTab === "sessions" ? (
          <SessionBoard
            sessions={filteredSessions}
            terminalProfiles={config.terminalProfiles}
            ideProfiles={config.ideProfiles}
            defaultSessionId={config.defaultSessionId}
            onCreateSession={handleCreateSession}
            onLaunchTerminal={handleLaunchTerminal}
            onLaunchIde={handleLaunchIde}
            onEnsureHome={handleEnsureHome}
            onRevealHome={handleRevealHome}
          />
        ) : null}

        {!loading && activeTab !== "sessions" ? (
          <EmptyState
            title="即将上线"
            description="终端与 IDE 详情页会在下一步提供编辑能力。"
          />
        ) : null}
      </main>
    </div>
  );
};

export default App;
