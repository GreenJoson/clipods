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
import ProfileToolbar from "./components/ProfileToolbar";
import EmptyState from "./components/EmptyState";
import ProfileEditor, { type ProfileKind } from "./components/ProfileEditor";
import ProfileCard from "./components/ProfileCard";
import SessionEditor from "./components/SessionEditor";
import SessionBoard from "./blocks/SessionBoard";
import { createConfigService, parseConfig, serializeConfig } from "./services/configService";
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
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionConfig | null>(
    null
  );
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

    try {
      setConfig(next);
      await configService.save(next);
      setEditorOpen(false);
      setEditingSession(null);
      setStatus(exists ? "会话已更新" : "会话已创建");
    } catch (error) {
      setStatus("保存失败");
    }
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

    try {
      setConfig(next);
      await configService.save(next);
      setProfileEditorOpen(false);
      setEditingProfile(null);
      setStatus(exists ? "配置已更新" : "配置已创建");
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

  const handleLaunchTerminal = async (session: SessionConfig) => {
    try {
      await invoke("launch_terminal", { workingDir: session.codexHome });
      setStatus("终端已打开");
    } catch (error) {
      setStatus("终端启动失败");
    }
  };

  const handleLaunchIde = async (session: SessionConfig, profile?: IdeProfile) => {
    try {
      await invoke("launch_ide", {
        app: profile?.command ?? "Visual Studio Code",
        targetPath: session.codexHome,
      });
      setStatus("IDE 已打开");
    } catch (error) {
      setStatus("IDE 启动失败");
    }
  };

  const handleEnsureHome = async (session: SessionConfig) => {
    try {
      await invoke("ensure_codex_home", { path: session.codexHome });
      setStatus("登录准备完成");
    } catch (error) {
      setStatus("登录准备失败");
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
      const configPath = await configService.getConfigPath();
      await invoke("reveal_path", { path: configPath });
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
        defaultPath: "codex-launcher.toml",
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
            onCreateSession={handleCreateSession}
            onLaunchTerminal={handleLaunchTerminal}
            onLaunchIde={handleLaunchIde}
            onEnsureHome={handleEnsureHome}
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
