/**
 * @input  依赖：React, Tauri API, 配置服务, Codex 配置生成, 登录状态检测, 终端安装检测, 更新检测, 平台检测, 帮助说明弹窗, UI 组件, 文件系统工具, 启动命令, 登录流程, 目录预创建与 auth.json 写入
 * @output 导出：App 组件
 * @pos    启动器 UI 主入口与状态协调
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { appConfigDir } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { check as checkForUpdates } from "@tauri-apps/plugin-updater";
import "./App.css";
import SegmentTabs from "./components/SegmentTabs";
import Toolbar from "./components/Toolbar";
import ProfileToolbar from "./components/ProfileToolbar";
import EmptyState from "./components/EmptyState";
import ProfileEditor, { type ProfileKind } from "./components/ProfileEditor";
import ProfileCard from "./components/ProfileCard";
import Modal from "./components/Modal";
import SessionEditor from "./components/SessionEditor";
import SessionBoard from "./blocks/SessionBoard";
import { createConfigService, parseConfig, serializeConfig } from "./services/configService";
import { buildCodexConfig } from "./services/codexConfig";
import type {
  AppConfig,
  IdeProfile,
  SessionConfig,
  TerminalProfile,
} from "./types/config";

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
  const [appVersion, setAppVersion] = useState<string>("");
  const [showFirstRunNotice, setShowFirstRunNotice] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionConfig | null>(
    null
  );
  const [loginStatusMap, setLoginStatusMap] = useState<
    Record<string, "missing" | "api" | "chatgpt">
  >({});
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileKind, setProfileKind] = useState<ProfileKind>("terminal");
  const [editingProfile, setEditingProfile] = useState<
    TerminalProfile | IdeProfile | null
  >(null);

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

  const writeCodexConfigFile = async (
    session: SessionConfig,
    resolvedHome: string | null
  ): Promise<void> => {
    const contents = buildCodexConfig(session);
    await invoke("write_codex_config", {
      path: resolvedHome ?? session.codexHome,
      contents,
    });
  };

  const writeCodexAuthFile = async (
    session: SessionConfig,
    resolvedHome: string | null
  ): Promise<void> => {
    if (session.loginType !== "api") {
      return;
    }
    const apiKey = session.env?.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return;
    }
    const contents = JSON.stringify({ OPENAI_API_KEY: apiKey }, null, 2);
    await invoke("write_codex_auth", {
      path: resolvedHome ?? session.codexHome,
      contents,
    });
  };

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
    let active = true;
    getVersion()
      .then((version) => {
        if (active) {
          setAppVersion(version);
        }
      })
      .catch(() => {
        if (active) {
          setAppVersion("");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const dismissed = localStorage.getItem("clipods.firstRunNotice.dismissed");
    if (dismissed === "1") {
      return () => {
        active = false;
      };
    }
    const platformLabel =
      typeof navigator !== "undefined"
        ? `${navigator.platform} ${navigator.userAgent}`
        : "";
    if (active && /mac|iphone|ipad|ipod/i.test(platformLabel)) {
      setShowFirstRunNotice(true);
    }
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadStatus = async () => {
      const entries = await Promise.all(
        config.sessions.map(async (session) => {
          if (session.loginType !== "chatgpt") {
            return [session.id, "api"] as const;
          }
          try {
            const status = await invoke<"missing" | "api" | "chatgpt">(
              "check_codex_auth",
              { path: session.codexHome }
            );
            return [session.id, status] as const;
          } catch (error) {
            return [session.id, "missing"] as const;
          }
        })
      );
      if (!active) {
        return;
      }
      setLoginStatusMap(Object.fromEntries(entries));
    };
    loadStatus().catch(() => {
      if (active) {
        setLoginStatusMap({});
      }
    });
    return () => {
      active = false;
    };
  }, [config.sessions]);

  const sanitizeEnvForLoginType = (
    session: SessionConfig,
    env: Record<string, string>
  ): Record<string, string> => {
    if (session.loginType !== "chatgpt") {
      return env;
    }
    const filtered = { ...env };
    delete filtered.OPENAI_API_KEY;
    delete filtered.OPENAI_BASE_URL;
    delete filtered.OPENAI_MODEL;
    delete filtered.OPENAI_ORGANIZATION;
    delete filtered.OPENAI_PROJECT;
    return filtered;
  };

  const refreshLoginStatus = async (session: SessionConfig) => {
    if (session.loginType !== "chatgpt") {
      setLoginStatusMap((prev) => ({ ...prev, [session.id]: "api" }));
      return;
    }
    try {
      const status = await invoke<"missing" | "api" | "chatgpt">(
        "check_codex_auth",
        { path: session.codexHome }
      );
      setLoginStatusMap((prev) => ({ ...prev, [session.id]: status }));
    } catch (error) {
      setLoginStatusMap((prev) => ({ ...prev, [session.id]: "missing" }));
    }
  };

  const pollLoginStatus = (session: SessionConfig) => {
    if (session.loginType !== "chatgpt") {
      return;
    }
    let attempts = 0;
    const run = async () => {
      attempts += 1;
      let status: "missing" | "api" | "chatgpt" = "missing";
      try {
        status = await invoke<"missing" | "api" | "chatgpt">(
          "check_codex_auth",
          { path: session.codexHome }
        );
        setLoginStatusMap((prev) => ({ ...prev, [session.id]: status }));
      } catch (error) {
        setLoginStatusMap((prev) => ({ ...prev, [session.id]: "missing" }));
      }
      if (status === "chatgpt" || attempts >= 15) {
        return;
      }
      window.setTimeout(run, 2000);
    };
    window.setTimeout(run, 1200);
  };

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

  const filteredTerminalProfiles = useMemo(() => {
    if (!searchValue) {
      return config.terminalProfiles;
    }
    const keyword = searchValue.toLowerCase();
    return config.terminalProfiles.filter(
      (profile) =>
        profile.name.toLowerCase().includes(keyword) ||
        profile.command.toLowerCase().includes(keyword)
    );
  }, [config.terminalProfiles, searchValue]);

  const filteredIdeProfiles = useMemo(() => {
    if (!searchValue) {
      return config.ideProfiles;
    }
    const keyword = searchValue.toLowerCase();
    return config.ideProfiles.filter(
      (profile) =>
        profile.name.toLowerCase().includes(keyword) ||
        profile.command.toLowerCase().includes(keyword)
    );
  }, [config.ideProfiles, searchValue]);

  const resolveStatusTone = (value: string): "success" | "error" | "neutral" => {
    if (/失败|错误|无法|失败/i.test(value)) {
      return "error";
    }
    if (/完成|已|成功|打开/i.test(value)) {
      return "success";
    }
    return "neutral";
  };

  const tabs = [
    { id: "sessions", label: "会话", count: config.sessions.length },
    { id: "terminals", label: "终端", count: config.terminalProfiles.length },
    { id: "ides", label: "IDE", count: config.ideProfiles.length },
  ];

  const handleCreateSession = async () => {
    try {
      const id = `session-${Date.now()}`;
      setEditingSession({
        id,
        name: `新会话 ${config.sessions.length + 1}`,
        codexHome: "~/.codex",
        loginType: "chatgpt",
      });
      setEditorOpen(true);
    } catch (error) {
      setStatus("创建会话失败");
    }
  };

  const handleEditSession = (session: SessionConfig) => {
    setEditingSession(session);
    setEditorOpen(true);
  };

  const handleSaveSession = async (session: SessionConfig) => {
    const exists = config.sessions.some((entry) => entry.id === session.id);
    const nextSessions = exists
      ? config.sessions.map((entry) =>
          entry.id === session.id ? session : entry
        )
      : [...config.sessions, session];

    const next: AppConfig = {
      ...config,
      sessions: nextSessions,
      defaultSessionId: config.defaultSessionId ?? session.id,
    };

    let ensureFailed = false;
    let resolvedHome: string | null = null;
    try {
      resolvedHome = await invoke<string>("ensure_codex_home", {
        path: session.codexHome,
      });
    } catch (error) {
      ensureFailed = true;
    }

    setConfig(next);
    setEditorOpen(false);
    setEditingSession(null);

    let statusText = ensureFailed
      ? "目录创建失败"
      : exists
        ? "会话已更新"
        : "会话已创建";
    try {
      await configService.save(next);
    } catch (error) {
      setStatus("保存失败");
      return;
    }

    if (!ensureFailed) {
      try {
        await writeCodexConfigFile(session, resolvedHome);
        await writeCodexAuthFile(session, resolvedHome);
        refreshLoginStatus(session).catch(() => undefined);
      } catch (error) {
        statusText = `${statusText}，Codex 配置写入失败`;
      }
    }
    setStatus(statusText);
  };

  const handleDeleteSession = async (sessionId: string) => {
    const confirmed = window.confirm("确定删除该会话？此操作不可撤销。");
    if (!confirmed) {
      return;
    }
    const nextSessions = config.sessions.filter(
      (session) => session.id !== sessionId
    );
    const next: AppConfig = {
      ...config,
      sessions: nextSessions,
      defaultSessionId:
        config.defaultSessionId === sessionId
          ? nextSessions[0]?.id
          : config.defaultSessionId,
    };

    try {
      setConfig(next);
      await configService.save(next);
      setEditorOpen(false);
      setEditingSession(null);
      setStatus("会话已删除");
    } catch (error) {
      setStatus("删除失败");
    }
  };

  const handleCreateProfile = (kind: ProfileKind) => {
    const id = `${kind}-${Date.now()}`;
    const profile =
      kind === "terminal"
        ? {
            id,
            name: `新终端 ${config.terminalProfiles.length + 1}`,
            command: "Terminal",
            args: [],
          }
        : {
            id,
            name: `新 IDE ${config.ideProfiles.length + 1}`,
            command: "Visual Studio Code",
            args: [],
          };
    setProfileKind(kind);
    setEditingProfile(profile);
    setProfileEditorOpen(true);
  };

  const handleEditProfile = (
    kind: ProfileKind,
    profile: TerminalProfile | IdeProfile
  ) => {
    setProfileKind(kind);
    setEditingProfile(profile);
    setProfileEditorOpen(true);
  };

  const handleSaveProfile = async (profile: TerminalProfile | IdeProfile) => {
    const isTerminal = profileKind === "terminal";
    const list = isTerminal ? config.terminalProfiles : config.ideProfiles;
    const exists = list.some((entry) => entry.id === profile.id);
    const nextList = exists
      ? list.map((entry) => (entry.id === profile.id ? profile : entry))
      : [...list, profile];

    const next: AppConfig = {
      ...config,
      terminalProfiles: isTerminal ? (nextList as TerminalProfile[]) : config.terminalProfiles,
      ideProfiles: isTerminal ? config.ideProfiles : (nextList as IdeProfile[]),
    };

    setConfig(next);
    setProfileEditorOpen(false);
    setEditingProfile(null);
    setStatus(exists ? "配置已更新" : "配置已创建");
    try {
      await configService.save(next);
    } catch (error) {
      setStatus("配置保存失败");
    }
  };

  const handleDeleteProfile = async (
    kind: ProfileKind,
    profileId: string
  ) => {
    const warning =
      kind === "terminal"
        ? "确定删除终端配置？关联会话将清除终端设置。"
        : "确定删除 IDE 配置？关联会话将清除 IDE 设置。";
    const confirmed = window.confirm(warning);
    if (!confirmed) {
      return;
    }
    const isTerminal = kind === "terminal";
    const nextTerminalProfiles = isTerminal
      ? config.terminalProfiles.filter((profile) => profile.id !== profileId)
      : config.terminalProfiles;
    const nextIdeProfiles = isTerminal
      ? config.ideProfiles
      : config.ideProfiles.filter((profile) => profile.id !== profileId);

    const nextSessions = config.sessions.map((session) => ({
      ...session,
      terminalProfileId:
        isTerminal && session.terminalProfileId === profileId
          ? undefined
          : session.terminalProfileId,
      ideProfileId:
        !isTerminal && session.ideProfileId === profileId
          ? undefined
          : session.ideProfileId,
    }));

    const next: AppConfig = {
      ...config,
      sessions: nextSessions,
      terminalProfiles: nextTerminalProfiles,
      ideProfiles: nextIdeProfiles,
    };

    try {
      setConfig(next);
      await configService.save(next);
      setProfileEditorOpen(false);
      setEditingProfile(null);
      setStatus("配置已删除");
    } catch (error) {
      setStatus("配置删除失败");
    }
  };

  const handleLaunchTerminal = async (
    session: SessionConfig,
    profile?: TerminalProfile
  ) => {
    try {
      if (profile?.command) {
        const installed = await invoke<boolean>("check_app_installed", {
          app: profile.command,
        });
        if (!installed) {
          setStatus(`未检测到终端应用：${profile.command}`);
          return;
        }
      }
      const resolvedHome = await invoke<string>("ensure_codex_home", {
        path: session.codexHome,
      });
      const mergedEnv = sanitizeEnvForLoginType(session, {
        ...(profile?.env ?? {}),
        ...(session.env ?? {}),
      });
      if (resolvedHome) {
        mergedEnv.CODEX_HOME = resolvedHome;
      }
      let configFailed = false;
      try {
        await writeCodexConfigFile(session, resolvedHome ?? null);
        await writeCodexAuthFile(session, resolvedHome ?? null);
      } catch (error) {
        configFailed = true;
      }
      await invoke("launch_terminal", {
        app: profile?.command,
        args: profile?.args,
        workingDir: resolvedHome,
        command: session.launchCommand,
        env: Object.keys(mergedEnv).length ? mergedEnv : undefined,
      });
      if (session.loginType === "chatgpt") {
        refreshLoginStatus(session).catch(() => undefined);
      }
      setStatus(configFailed ? "终端已打开，但 Codex 配置写入失败" : "终端已打开");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message ? `终端启动失败：${message}` : "终端启动失败");
    }
  };

  const handleLaunchIde = async (session: SessionConfig, profile?: IdeProfile) => {
    try {
      await invoke("launch_ide", {
        app: profile?.command ?? "Visual Studio Code",
        args: profile?.args,
        targetPath: session.codexHome,
      });
      setStatus("IDE 已打开");
    } catch (error) {
      setStatus("IDE 启动失败");
    }
  };

  const handleLogin = async (
    session: SessionConfig,
    profile?: TerminalProfile
  ) => {
    if (session.loginType !== "chatgpt") {
      setStatus("API 登录请在环境变量中配置 OPENAI_API_KEY。");
      return;
    }
    try {
      const resolvedHome = await invoke<string>("ensure_codex_home", {
        path: session.codexHome,
      });
      const mergedEnv = sanitizeEnvForLoginType(session, {
        ...(profile?.env ?? {}),
        ...(session.env ?? {}),
      });
      if (resolvedHome) {
        mergedEnv.CODEX_HOME = resolvedHome;
      }
      let configFailed = false;
      try {
        await writeCodexConfigFile(session, resolvedHome ?? null);
        await writeCodexAuthFile(session, resolvedHome ?? null);
      } catch (error) {
        configFailed = true;
      }
      await invoke("launch_terminal", {
        app: profile?.command,
        args: profile?.args,
        workingDir: resolvedHome,
        command: "codex login",
        env: Object.keys(mergedEnv).length ? mergedEnv : undefined,
      });
      pollLoginStatus(session);
      setStatus(
        configFailed ? "已打开官方登录，但 Codex 配置写入失败" : "已打开官方登录"
      );
    } catch (error) {
      setStatus("官方登录启动失败");
    }
  };

  const handleRevealHome = async (session: SessionConfig) => {
    try {
      await invoke("reveal_path", { path: session.codexHome });
    } catch (error) {
      setStatus("打开目录失败");
    }
  };

  const handleRevealConfig = async () => {
    try {
      await configService.save(config);
      const configPath = await configService.getConfigPath();
      await invoke("reveal_path", { path: configPath });
      setStatus("配置目录已打开");
    } catch (error) {
      setStatus("打开配置失败");
    }
  };

  const handleImport = async () => {
    try {
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
    } catch (error) {
      setStatus("导入失败");
    }
  };

  const handleExport = async () => {
    try {
      const target = await save({
        defaultPath: "clipods.toml",
        filters: [{ name: "TOML", extensions: ["toml"] }],
      });
      if (!target) {
        return;
      }
      await writeTextFile(target, serializeConfig(config));
      setStatus("导出完成");
    } catch (error) {
      setStatus("导出失败");
    }
  };

  const handleCheckUpdates = async () => {
    try {
      setStatus("正在检查更新…");
      const update = await checkForUpdates();
      if (!update) {
        setStatus("当前已是最新版本");
        return;
      }
      setStatus(`发现更新 v${update.version}，正在下载…`);
      await update.downloadAndInstall();
      setStatus("更新已下载，重启应用完成安装");
    } catch (error) {
      setStatus("更新检查失败");
    }
  };

  const handleDismissFirstRunNotice = (persist: boolean) => {
    if (persist) {
      localStorage.setItem("clipods.firstRunNotice.dismissed", "1");
    }
    setShowFirstRunNotice(false);
  };

  const handleOpenHelp = () => {
    setShowHelpModal(true);
  };

  const handleCloseHelp = () => {
    setShowHelpModal(false);
  };

  return (
    <div className="app-shell">
      <Modal
        open={showFirstRunNotice}
        title="首次启动提示（macOS）"
        description="未签名应用首次启动需要手动允许。"
        onClose={() => handleDismissFirstRunNotice(false)}
        footer={
          <div className="modal-footer-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => handleDismissFirstRunNotice(true)}
            >
              不再提示
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleDismissFirstRunNotice(false)}
            >
              知道了
            </button>
          </div>
        }
      >
        <div className="first-run-notice">
          <p>如果提示“无法验证开发者”，请按以下方式操作：</p>
          <ol>
            <li>打开“系统设置 → 隐私与安全”。</li>
            <li>在“已阻止”提示旁点击“仍要打开”。</li>
            <li>或在 Finder 里右键 App → 打开，再确认一次。</li>
          </ol>
        </div>
      </Modal>
      <Modal
        open={showHelpModal}
        title="使用说明"
        description="常见问题与首次启动指引。"
        onClose={handleCloseHelp}
        footer={
          <div className="modal-footer-actions">
            <button type="button" className="btn btn-primary" onClick={handleCloseHelp}>
              关闭
            </button>
          </div>
        }
      >
        <div className="help-notice">
          <section>
            <h4>macOS 首次启动</h4>
            <p>若提示“无法验证开发者”，请进入“系统设置 → 隐私与安全”，点击“仍要打开”。</p>
          </section>
          <section>
            <h4>会话隔离</h4>
            <p>每个会话绑定独立的 CODEX_HOME，配置与登录互不影响。</p>
          </section>
          <section>
            <h4>更新</h4>
            <p>点击右上角“检查更新”，从 GitHub Releases 获取最新版本。</p>
          </section>
        </div>
      </Modal>
      <header className="topbar surface motion-rise-in">
        <div className="brand">
          <div className="brand-badge">C</div>
          <div className="brand-copy">
            <span className="brand-title">clipods</span>
            <span className="brand-subtitle">
              多会话启动器
              <span className="brand-version">
                {appVersion ? `v${appVersion}` : "v--"}
              </span>
            </span>
          </div>
        </div>
        <SegmentTabs items={tabs} activeId={activeTab} onChange={setActiveTab} />
        <div className="top-actions">
          {status ? (
            <span
              className={`top-status top-status-${resolveStatusTone(status)}`}
            >
              {status}
            </span>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={handleOpenHelp}>
            帮助
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleCheckUpdates}>
            检查更新
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleRevealConfig}>
            配置目录
          </button>
        </div>
      </header>

      <main
        className="content"
        id={`${activeTab}-panel`}
        role="tabpanel"
        aria-labelledby={`${activeTab}-tab`}
      >
        {activeTab === "sessions" ? (
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
        ) : (
          <ProfileToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            totalCount={
              activeTab === "terminals"
                ? config.terminalProfiles.length
                : config.ideProfiles.length
            }
            filteredCount={
              activeTab === "terminals"
                ? filteredTerminalProfiles.length
                : filteredIdeProfiles.length
            }
            actionLabel={
              activeTab === "terminals" ? "新建终端配置" : "新建 IDE 配置"
            }
            onCreate={() =>
              handleCreateProfile(
                activeTab === "terminals" ? "terminal" : "ide"
              )
            }
          />
        )}

        {loading ? (
          <EmptyState title="加载中" description="正在读取配置…" />
        ) : null}

        {!loading && activeTab === "sessions" ? (
          <SessionBoard
            sessions={filteredSessions}
            terminalProfiles={config.terminalProfiles}
            ideProfiles={config.ideProfiles}
            defaultSessionId={config.defaultSessionId}
            loginStatusMap={loginStatusMap}
            onCreateSession={handleCreateSession}
            onLaunchTerminal={handleLaunchTerminal}
            onLaunchIde={handleLaunchIde}
            onLogin={handleLogin}
            onRevealHome={handleRevealHome}
            onEditSession={handleEditSession}
          />
        ) : null}

        {!loading && activeTab === "terminals" ? (
          filteredTerminalProfiles.length ? (
            <div className="profile-grid">
              {filteredTerminalProfiles.map((profile, index) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  kindLabel="终端"
                  delayMs={index * 70}
                  onEdit={() => handleEditProfile("terminal", profile)}
                  onDelete={() => handleDeleteProfile("terminal", profile.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="还没有终端配置"
              description="添加你常用的终端与启动参数，例如 iTerm2、Warp。"
              actionLabel="新建终端配置"
              onAction={() => handleCreateProfile("terminal")}
            />
          )
        ) : null}

        {!loading && activeTab === "ides" ? (
          filteredIdeProfiles.length ? (
            <div className="profile-grid">
              {filteredIdeProfiles.map((profile, index) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  kindLabel="IDE"
                  delayMs={index * 70}
                  onEdit={() => handleEditProfile("ide", profile)}
                  onDelete={() => handleDeleteProfile("ide", profile.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="还没有 IDE 配置"
              description="添加 VS Code、Cursor 或 Antigravity 的启动命令。"
              actionLabel="新建 IDE 配置"
              onAction={() => handleCreateProfile("ide")}
            />
          )
        ) : null}
      </main>

      {editingSession ? (
        <SessionEditor
          open={editorOpen}
          session={editingSession}
          isNew={
            !config.sessions.some((entry) => entry.id === editingSession.id)
          }
          terminalProfiles={config.terminalProfiles}
          ideProfiles={config.ideProfiles}
          onSave={handleSaveSession}
          onCancel={() => {
            setEditorOpen(false);
            setEditingSession(null);
          }}
          onDelete={
            config.sessions.some((entry) => entry.id === editingSession.id)
              ? handleDeleteSession
              : undefined
          }
        />
      ) : null}

      {editingProfile ? (
        <ProfileEditor
          open={profileEditorOpen}
          kind={profileKind}
          profile={editingProfile}
          onSave={handleSaveProfile}
          onCancel={() => {
            setProfileEditorOpen(false);
            setEditingProfile(null);
          }}
          onDelete={(profileId) => handleDeleteProfile(profileKind, profileId)}
        />
      ) : null}
    </div>
  );
};

export default App;
