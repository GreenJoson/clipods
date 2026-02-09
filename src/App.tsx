/**
 * @input  依赖：React, Tauri API, 配置服务, Codex 配置生成, 登录状态检测, 终端安装检测, Codex.app 启动, 更新检测, 平台检测, 帮助说明/删除确认弹窗, i18n, 主题切换, UI 组件, 文件系统工具, 启动命令, 登录流程, 目录预创建与 auth.json 写入, 终端配置引导与回填
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
import logoImg from "./assets/logo.png";
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
import { useI18n } from "./i18n";
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
  const [pendingProfileDelete, setPendingProfileDelete] = useState<{
    kind: ProfileKind;
    id: string;
    name: string;
  } | null>(null);
  const [pendingProfileSelection, setPendingProfileSelection] = useState<{
    kind: ProfileKind;
    sessionId: string;
  } | null>(null);
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
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "light";
    }
    const saved = window.localStorage.getItem("clipods.theme");
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  });
  const { t, locale, setLocale } = useI18n();

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

  const resolveCodexAppPath = (session: SessionConfig): string => {
    const trimmed = session.codexAppPath?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : "/Applications/Codex.app";
  };

  const resolveCodexAppUserDataDir = (
    session: SessionConfig,
    resolvedHome: string
  ): string | undefined => {
    const explicit = session.codexAppUserDataDir?.trim();
    if (explicit) {
      return explicit;
    }
    if (session.codexAppAllowMultiple) {
      return `${resolvedHome.replace(/\/+$/u, "")}/app_data`;
    }
    return undefined;
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

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("clipods.theme", theme);
  }, [theme]);

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
    if (/失败|错误|无法|失败|fail|error|unable|forbidden|not found|missing/i.test(value)) {
      return "error";
    }
    if (/完成|已|成功|打开|done|opened|updated|created|saved|downloaded|installed|complete/i.test(value)) {
      return "success";
    }
    return "neutral";
  };

  const tabs = [
    { id: "sessions", label: t("tab.sessions"), count: config.sessions.length },
    { id: "terminals", label: t("tab.terminals"), count: config.terminalProfiles.length },
    { id: "ides", label: t("tab.ides"), count: config.ideProfiles.length },
  ];

  const handleCreateSession = async () => {
    try {
      const id = `session-${Date.now()}`;
      setEditingSession({
        id,
        name: t("session.defaultName", { index: config.sessions.length + 1 }),
        codexHome: "~/.codex",
        loginType: "chatgpt",
      });
      setEditorOpen(true);
    } catch (error) {
      setStatus(t("status.createSessionFailed"));
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
      ? t("status.directoryCreateFailed")
      : exists
        ? t("status.sessionUpdated")
        : t("status.sessionCreated");
    try {
      await configService.save(next);
    } catch (error) {
      setStatus(t("status.sessionSaveFailed"));
      return;
    }

    if (!ensureFailed) {
      try {
        await writeCodexConfigFile(session, resolvedHome);
        await writeCodexAuthFile(session, resolvedHome);
        refreshLoginStatus(session).catch(() => undefined);
      } catch (error) {
        statusText = t("status.codexConfigWriteFailed", { prefix: statusText });
      }
    }
    setStatus(statusText);
  };

  const handleDeleteSession = async (sessionId: string) => {
    const confirmed = window.confirm(t("modal.delete.confirmSession"));
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
      setStatus(t("status.sessionDeleted"));
    } catch (error) {
      setStatus(t("status.sessionDeleteFailed"));
    }
  };

  const handleCreateProfile = (kind: ProfileKind, sessionId?: string) => {
    const id = `${kind}-${Date.now()}`;
    const profile =
      kind === "terminal"
        ? {
            id,
            name: t("profile.defaultTerminalName", { index: config.terminalProfiles.length + 1 }),
            command: "Terminal",
            args: [],
          }
        : {
            id,
            name: t("profile.defaultIdeName", { index: config.ideProfiles.length + 1 }),
            command: "Visual Studio Code",
            args: [],
          };
    setProfileKind(kind);
    setEditingProfile(profile);
    setProfileEditorOpen(true);
    if (sessionId) {
      setPendingProfileSelection({ kind, sessionId });
    } else {
      setPendingProfileSelection(null);
    }
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
    if (
      pendingProfileSelection &&
      pendingProfileSelection.kind === profileKind &&
      editingSession &&
      editingSession.id === pendingProfileSelection.sessionId
    ) {
      setEditingSession((prev) =>
        prev && prev.id === pendingProfileSelection.sessionId
          ? {
              ...prev,
              terminalProfileId:
                profileKind === "terminal" ? profile.id : prev.terminalProfileId,
              ideProfileId:
                profileKind === "ide" ? profile.id : prev.ideProfileId,
            }
          : prev
      );
      setEditorOpen(true);
    }
    setPendingProfileSelection(null);
    setStatus(exists ? t("status.profileUpdated") : t("status.profileCreated"));
    try {
      await configService.save(next);
    } catch (error) {
      setStatus(t("status.profileSaveFailed"));
    }
  };

  const performDeleteProfile = async (
    kind: ProfileKind,
    profileId: string
  ) => {
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
      setStatus(t("status.profileDeleted"));
    } catch (error) {
      setStatus(t("status.profileDeleteFailed"));
    }
  };

  const requestDeleteProfile = (
    kind: ProfileKind,
    profile: TerminalProfile | IdeProfile
  ) => {
    setPendingProfileDelete({ kind, id: profile.id, name: profile.name });
  };

  const handleDeleteProfile = (kind: ProfileKind, profileId: string) => {
    const list = kind === "terminal" ? config.terminalProfiles : config.ideProfiles;
    const found = list.find((profile) => profile.id === profileId);
    if (found) {
      requestDeleteProfile(kind, found);
      return;
    }
    performDeleteProfile(kind, profileId).catch(() => undefined);
  };

  const cancelDeleteProfile = () => {
    setPendingProfileDelete(null);
  };

  const confirmDeleteProfile = async () => {
    if (!pendingProfileDelete) {
      return;
    }
    await performDeleteProfile(pendingProfileDelete.kind, pendingProfileDelete.id);
    setPendingProfileDelete(null);
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
          setStatus(t("status.terminalNotFound", { app: profile.command }));
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
      setStatus(
        configFailed
          ? t("status.terminalOpenedConfigFailed")
          : t("status.terminalOpened")
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(
        message
          ? t("status.terminalLaunchFailed", { message })
          : t("status.terminalLaunchFailedSimple")
      );
    }
  };

  const handleLaunchCodexApp = async (session: SessionConfig) => {
    if (!session.codexAppEnabled) {
      setStatus(t("status.codexAppDisabled"));
      return;
    }
    const appPath = resolveCodexAppPath(session);
    try {
      const installed = await invoke<boolean>("check_app_installed", {
        app: appPath,
      });
      if (!installed) {
        setStatus(t("status.codexAppNotFound", { app: appPath }));
        return;
      }
      const resolvedHome = await invoke<string>("ensure_codex_home", {
        path: session.codexHome,
      });
      const mergedEnv = sanitizeEnvForLoginType(session, {
        ...(session.env ?? {}),
      });
      if (resolvedHome) {
        mergedEnv.CODEX_HOME = resolvedHome;
      }
      const userDataDir = resolveCodexAppUserDataDir(session, resolvedHome);
      let ensuredUserDataDir: string | undefined;
      if (userDataDir) {
        try {
          ensuredUserDataDir = await invoke<string>("ensure_codex_home", {
            path: userDataDir,
          });
        } catch (error) {
          setStatus(t("status.userDataDirFailed"));
          return;
        }
      }
      let configFailed = false;
      try {
        await writeCodexConfigFile(session, resolvedHome ?? null);
        await writeCodexAuthFile(session, resolvedHome ?? null);
      } catch (error) {
        configFailed = true;
      }
      await invoke("launch_codex_app", {
        appPath,
        userDataDir: ensuredUserDataDir ?? userDataDir,
        allowMultiple: session.codexAppAllowMultiple,
        env: Object.keys(mergedEnv).length ? mergedEnv : undefined,
      });
      if (session.loginType === "chatgpt") {
        refreshLoginStatus(session).catch(() => undefined);
      }
      setStatus(
        configFailed
          ? t("status.codexAppOpenedConfigFailed")
          : t("status.codexAppOpened")
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(
        message
          ? t("status.codexAppLaunchFailed", { message })
          : t("status.codexAppLaunchFailedSimple")
      );
    }
  };

  const handleLaunchIde = async (session: SessionConfig, profile?: IdeProfile) => {
    try {
      await invoke("launch_ide", {
        app: profile?.command ?? "Visual Studio Code",
        args: profile?.args,
        targetPath: session.codexHome,
      });
      setStatus(t("status.ideOpened"));
    } catch (error) {
      setStatus(t("status.ideLaunchFailed"));
    }
  };

  const handleLogin = async (
    session: SessionConfig,
    profile?: TerminalProfile
  ) => {
    if (session.loginType !== "chatgpt") {
      setStatus(t("status.apiLoginHint"));
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
        configFailed
          ? t("status.loginOpenedConfigFailed")
          : t("status.loginOpened")
      );
    } catch (error) {
      setStatus(t("status.loginLaunchFailed"));
    }
  };

  const handleRevealHome = async (session: SessionConfig) => {
    try {
      await invoke("reveal_path", { path: session.codexHome });
    } catch (error) {
      setStatus(t("status.openDirFailed"));
    }
  };

  const handleRevealConfig = async () => {
    try {
      await configService.save(config);
      const configPath = await configService.getConfigPath();
      await invoke("reveal_path", { path: configPath });
      setStatus(t("status.configDirOpened"));
    } catch (error) {
      setStatus(t("status.configOpenFailed"));
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
      setStatus(t("status.importDone"));
    } catch (error) {
      setStatus(t("status.importFailed"));
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
      setStatus(t("status.exportDone"));
    } catch (error) {
      setStatus(t("status.exportFailed"));
    }
  };

  const handleCheckUpdates = async () => {
    try {
      setStatus(t("status.updateChecking"));
      const update = await checkForUpdates();
      if (!update) {
        setStatus(t("status.upToDate"));
        return;
      }
      setStatus(t("status.updateFound", { version: update.version }));
      await update.downloadAndInstall();
      setStatus(t("status.updateDownloaded"));
    } catch (error) {
      setStatus(t("status.updateCheckFailed"));
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
        title={t("modal.firstRun.title")}
        description={t("modal.firstRun.desc")}
        onClose={() => handleDismissFirstRunNotice(false)}
        footer={
          <div className="modal-footer-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => handleDismissFirstRunNotice(true)}
            >
              {t("modal.firstRun.dismiss")}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleDismissFirstRunNotice(false)}
            >
              {t("modal.firstRun.ok")}
            </button>
          </div>
        }
      >
        <div className="first-run-notice">
          <p>{t("modal.firstRun.stepIntro")}</p>
          <ol>
            <li>{t("modal.firstRun.step1")}</li>
            <li>{t("modal.firstRun.step2")}</li>
            <li>{t("modal.firstRun.step3")}</li>
          </ol>
        </div>
      </Modal>
      <Modal
        open={showHelpModal}
        title={t("modal.help.title")}
        description={t("modal.help.desc")}
        onClose={handleCloseHelp}
        footer={
          <div className="modal-footer-actions">
            <button type="button" className="btn btn-primary" onClick={handleCloseHelp}>
              {t("modal.help.close")}
            </button>
          </div>
        }
      >
        <div className="help-notice">
          <section>
            <h4>{t("help.section.mac.title")}</h4>
            <p>{t("help.section.mac.body")}</p>
          </section>
          <section>
            <h4>{t("help.section.isolation.title")}</h4>
            <p>{t("help.section.isolation.body")}</p>
          </section>
          <section>
            <h4>{t("help.section.update.title")}</h4>
            <p>{t("help.section.update.body")}</p>
          </section>
        </div>
      </Modal>
      <header className="topbar surface motion-rise-in">
        <div className="brand">
          <img src={logoImg} alt="CLIPods" className="brand-logo" />
          <div className="brand-copy">
            <span className="brand-title">clipods</span>
            <span className="brand-subtitle">
              {t("brand.subtitle")}
              <span className="brand-version">
                {appVersion ? `v${appVersion}` : "v--"}
              </span>
            </span>
          </div>
          <div className="brand-toggle-group">
            <button
              type="button"
              className="toggle-pill"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              title={t("toggle.theme")}
              aria-label={t("toggle.theme")}
            >
              {theme === "light" ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 3v2M12 19v2M5 5l1.4 1.4M17.6 17.6L19 19M3 12h2M19 12h2M5 19l1.4-1.4M17.6 6.4L19 5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 14.5A7.5 7.5 0 0 1 9.5 3a9 9 0 1 0 11.5 11.5z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              className="toggle-pill toggle-lang"
              onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
              title={t("toggle.locale")}
              aria-label={t("toggle.locale")}
            >
              {locale === "zh" ? "ZH" : "EN"}
            </button>
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
            {t("action.help")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleCheckUpdates}>
            {t("action.checkUpdates")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleRevealConfig}>
            {t("action.openConfigDir")}
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
            onImport={handleImport}
            onExport={handleExport}
            onCreateSession={handleCreateSession}
            onRevealConfig={handleRevealConfig}
            labels={{
              searchPlaceholder: t("toolbar.searchSessions.placeholder"),
              searchAria: t("toolbar.searchSessions.aria"),
              total: t("toolbar.total", { count: config.sessions.length }),
              filtered: t("toolbar.show", { count: filteredSessions.length }),
              openConfig: t("toolbar.openConfigDir"),
              import: t("toolbar.import"),
              export: t("toolbar.export"),
              createSession: t("toolbar.createSession"),
            }}
          />
        ) : (
          <ProfileToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            actionLabel={
              activeTab === "terminals"
                ? t("empty.terminals.action")
                : t("empty.ides.action")
            }
            onCreate={() =>
              handleCreateProfile(
                activeTab === "terminals" ? "terminal" : "ide"
              )
            }
            labels={{
              searchPlaceholder: t("profileToolbar.search.placeholder"),
              searchAria: t("profileToolbar.search.aria"),
              total: t("profileToolbar.total", {
                count:
                  activeTab === "terminals"
                    ? config.terminalProfiles.length
                    : config.ideProfiles.length,
              }),
              filtered: t("profileToolbar.show", {
                count:
                  activeTab === "terminals"
                    ? filteredTerminalProfiles.length
                    : filteredIdeProfiles.length,
              }),
            }}
          />
        )}

        {loading ? (
          <EmptyState
            title={t("empty.loading.title")}
            description={t("empty.loading.desc")}
          />
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
            onLaunchCodexApp={handleLaunchCodexApp}
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
                  kindLabel={t("tab.terminals")}
                  delayMs={index * 70}
                  onEdit={() => handleEditProfile("terminal", profile)}
                  onDelete={() => requestDeleteProfile("terminal", profile)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={t("empty.terminals.title")}
              description={t("empty.terminals.desc")}
              actionLabel={t("empty.terminals.action")}
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
                  kindLabel={t("tab.ides")}
                  delayMs={index * 70}
                  onEdit={() => handleEditProfile("ide", profile)}
                  onDelete={() => requestDeleteProfile("ide", profile)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={t("empty.ides.title")}
              description={t("empty.ides.desc")}
              actionLabel={t("empty.ides.action")}
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
          onCreateTerminalProfile={() =>
            handleCreateProfile("terminal", editingSession.id)
          }
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
      <Modal
        open={Boolean(pendingProfileDelete)}
        title={
          pendingProfileDelete?.kind === "terminal"
            ? t("modal.deleteTerminal.title")
            : t("modal.deleteIde.title")
        }
        description={t("modal.delete.desc")}
        onClose={cancelDeleteProfile}
        size="compact"
        footer={
          <div className="modal-footer-actions">
            <button type="button" className="btn btn-ghost" onClick={cancelDeleteProfile}>
              {t("modal.delete.cancel")}
            </button>
            <button type="button" className="btn btn-primary" onClick={confirmDeleteProfile}>
              {t("modal.delete.confirm")}
            </button>
          </div>
        }
      >
        <div className="confirm-summary">
          {t("modal.delete.prefix")}
          <div className="confirm-target">
            {pendingProfileDelete?.name ?? "-"}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;
