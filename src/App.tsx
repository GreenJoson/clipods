/**
 * @input  依赖：React, Tauri API, 配置服务, 账号绑定解析、Codex/Claude 配置生成, 登录状态检测, 终端安装检测, Codex.app 启动（多开隔离）, 更新检测, 平台检测, 帮助说明/删除确认弹窗, i18n, 主题切换, UI 组件, 文件系统工具, 启动命令, 登录流程（官方登录优先终端触发 OAuth：Codex/Claude；失败兜底浏览器）, 目录预创建与 auth.json/AGENTS/global-state 写入, 终端配置引导与回填, 会话终端/IDE/账号快速切换持久化, IDE 环境隔离注入/新实例控制、Codex/Claude 客户端切换与项目路径解析、Codex/Claude 配置集隔离切换、底部信息栏
 * @output 导出：App 组件（含会话/账号/终端/IDE 四类配置界面）
 * @pos    启动器 UI 主入口与状态协调（含可复用账号池、会话绑定账号、Codex ChatGPT/API 与 Claude API 启动投影、Codex.app 多开隔离、会话内终端/IDE/客户端偏好记忆、IDE 环境隔离与新实例控制、Codex/Claude 会话分流、官方登录终端触发与浏览器兜底、配置集隔离、底部信息栏与运行时默认自愈）
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { appConfigDir } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { openUrl } from "@tauri-apps/plugin-opener";
import { check as checkForUpdates } from "@tauri-apps/plugin-updater";
import "./App.css";
import logoImg from "./assets/logo.png";
import SegmentTabs from "./components/SegmentTabs";
import Toolbar from "./components/Toolbar";
import ProfileToolbar from "./components/ProfileToolbar";
import EmptyState from "./components/EmptyState";
import AccountEditor from "./components/AccountEditor";
import ProfileEditor, { type ProfileKind } from "./components/ProfileEditor";
import ProfileCard from "./components/ProfileCard";
import Modal from "./components/Modal";
import SessionEditor from "./components/SessionEditor";
import AccountBoard from "./blocks/AccountBoard";
import SessionBoard from "./blocks/SessionBoard";
import {
  createConfigService,
  parseConfig,
  serializeConfig,
  type ConfigScope,
} from "./services/configService";
import { buildClaudeJson, buildClaudeSettingsJson } from "./services/claudeConfig";
import { resolveAccountBinding } from "./services/accountBinding";
import { buildCodexConfig } from "./services/codexConfig";
import {
  getDefaultSessionHome,
  parseSessionProjectPath,
  resolveOfficialLoginCommand,
  resolveOfficialLoginFlow,
  setSessionBoundAccount,
  setSessionClientType,
  setSessionIdeProfile,
  setSessionTerminalProfile,
} from "./models/session";
import { useI18n } from "./i18n";
import type {
  AppConfig,
  AuthAccount,
  IdeProfile,
  SessionClientType,
  SessionConfig,
  TerminalProfile,
} from "./types/config";

const EMPTY_CONFIG: AppConfig = {
  version: 1,
  sessions: [],
  terminalProfiles: [],
  ideProfiles: [],
  accounts: [],
};
const CONFIG_SCOPE_STORAGE_KEY = "clipods.configScope";

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
  const [accountEditorOpen, setAccountEditorOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AuthAccount | null>(null);
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
  const [configScope, setConfigScope] = useState<ConfigScope>(() => {
    if (typeof window === "undefined") {
      return "codex";
    }
    const saved = window.localStorage.getItem(CONFIG_SCOPE_STORAGE_KEY);
    return saved === "claude" ? "claude" : "codex";
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
    () => createConfigService(fileClient, pathProvider, { scope: configScope }),
    [configScope, fileClient, pathProvider]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(CONFIG_SCOPE_STORAGE_KEY, configScope);
  }, [configScope]);

  const findBoundAccount = (session: SessionConfig): AuthAccount | undefined =>
    session.boundAccountId
      ? config.accounts.find((account) => account.id === session.boundAccountId)
      : undefined;

  const resolveRuntimeSession = (session: SessionConfig) => {
    const account = findBoundAccount(session);
    const binding = resolveAccountBinding(session, account);
    return {
      account,
      binding,
      runtimeSession: {
        ...session,
        loginType: binding.loginType,
        env: binding.env,
      },
    };
  };

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
    resolvedHome: string | null,
    authPayload?: ReturnType<typeof resolveAccountBinding>["authPayload"]
  ): Promise<void> => {
    if (!authPayload) {
      return;
    }
    const contents =
      authPayload.kind === "chatgpt"
        ? authPayload.json
        : JSON.stringify({ OPENAI_API_KEY: authPayload.apiKey }, null, 2);
    await invoke("write_codex_auth", {
      path: resolvedHome ?? session.codexHome,
      contents,
    });
  };

  const writeClaudeConfigFiles = async (
    session: SessionConfig,
    resolvedHome: string | null
  ): Promise<void> => {
    const settings = buildClaudeSettingsJson(session);
    const claudeJson = buildClaudeJson(session);
    const targetPath = resolvedHome ?? session.codexHome;
    const tasks: Array<Promise<unknown>> = [];
    if (settings) {
      tasks.push(
        invoke("write_claude_settings", {
          path: targetPath,
          contents: settings,
        })
      );
    }
    if (claudeJson) {
      tasks.push(
        invoke("write_claude_json", {
          path: targetPath,
          contents: claudeJson,
        })
      );
    }
    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
  };

  const ensureCodexRuntimeDefaults = async (
    resolvedHome: string | null
  ): Promise<void> => {
    if (!resolvedHome) {
      return;
    }
    await Promise.allSettled([
      invoke("ensure_codex_agents", { path: resolvedHome }),
      invoke("ensure_codex_global_state", { path: resolvedHome }),
    ]);
  };

  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      if (mounted) {
        setLoading(true);
      }
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
          const account = findBoundAccount(session);
          const binding = resolveAccountBinding(session, account);
          if (!isCodexClient(session)) {
            return [session.id, binding.loginType === "api" ? "api" : "missing"] as const;
          }
          if (account?.type === "chatgpt") {
            return [session.id, "chatgpt"] as const;
          }
          if (binding.loginType !== "chatgpt") {
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
  }, [config.accounts, config.sessions]);

  const sanitizeEnvForLoginType = (
    loginType: SessionConfig["loginType"],
    env: Record<string, string>
  ): Record<string, string> => {
    if (loginType !== "chatgpt") {
      return env;
    }
    const filtered = { ...env };
    delete filtered.OPENAI_API_KEY;
    delete filtered.OPENAI_BASE_URL;
    delete filtered.OPENAI_MODEL;
    delete filtered.OPENAI_ORGANIZATION;
    delete filtered.OPENAI_PROJECT;
    delete filtered.ANTHROPIC_API_KEY;
    delete filtered.ANTHROPIC_AUTH_TOKEN;
    delete filtered.ANTHROPIC_BASE_URL;
    delete filtered.ANTHROPIC_MODEL;
    return filtered;
  };

  const isCodexClient = (session: SessionConfig): boolean =>
    (session.clientType ?? "codex") === "codex";

  const resolveLoginUrl = (session: SessionConfig): string =>
    isCodexClient(session)
      ? "https://chatgpt.com/codex"
      : "https://claude.ai/login";

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
      const safeSessionId = session.id.replace(/[^a-zA-Z0-9_-]+/g, "_");
      return `${resolvedHome.replace(/\/+$/u, "")}/app_data/${safeSessionId}`;
    }
    return undefined;
  };

  const refreshLoginStatus = async (session: SessionConfig) => {
    const account = findBoundAccount(session);
    const binding = resolveAccountBinding(session, account);
    if (!isCodexClient(session)) {
      setLoginStatusMap((prev) => ({
        ...prev,
        [session.id]: binding.loginType === "api" ? "api" : "missing",
      }));
      return;
    }
    if (account?.type === "chatgpt") {
      setLoginStatusMap((prev) => ({ ...prev, [session.id]: "chatgpt" }));
      return;
    }
    if (binding.loginType !== "chatgpt") {
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
    const account = findBoundAccount(session);
    const binding = resolveAccountBinding(session, account);
    if (!isCodexClient(session) || binding.loginType !== "chatgpt" || Boolean(account)) {
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

  const filteredAccounts = useMemo(() => {
    if (!searchValue) {
      return config.accounts;
    }
    const keyword = searchValue.toLowerCase();
    return config.accounts.filter(
      (account) =>
        account.name.toLowerCase().includes(keyword) ||
        account.type.toLowerCase().includes(keyword)
    );
  }, [config.accounts, searchValue]);

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
    { id: "accounts", label: t("tab.accounts"), count: config.accounts.length },
    { id: "terminals", label: t("tab.terminals"), count: config.terminalProfiles.length },
    { id: "ides", label: t("tab.ides"), count: config.ideProfiles.length },
  ];

  const handleCreateSession = async () => {
    try {
      const id = `session-${Date.now()}`;
      setEditingSession({
        id,
        name: t("session.defaultName", { index: config.sessions.length + 1 }),
        codexHome: getDefaultSessionHome(
          configScope === "claude" ? "claude" : "codex"
        ),
        clientType: configScope === "claude" ? "claude" : "codex",
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

  const handleDuplicateSession = async (session: SessionConfig) => {
    const newId = `session-${Date.now()}`;
    const duplicatedSession: SessionConfig = {
      ...session,
      id: newId,
      name: `${session.name} (副本)`,
    };

    setEditingSession(duplicatedSession);
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
        const { binding, runtimeSession } = resolveRuntimeSession(session);
        if (isCodexClient(runtimeSession)) {
          await writeCodexConfigFile(runtimeSession, resolvedHome);
          await writeCodexAuthFile(runtimeSession, resolvedHome, binding.authPayload);
        } else {
          await writeClaudeConfigFiles(runtimeSession, resolvedHome);
        }
        refreshLoginStatus(session).catch(() => undefined);
      } catch (error) {
        statusText = isCodexClient(session)
          ? t("status.codexConfigWriteFailed", { prefix: statusText })
          : t("status.claudeConfigWriteFailed", { prefix: statusText });
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

  const handleSwitchTerminalProfile = async (
    session: SessionConfig,
    terminalProfileId?: string
  ) => {
    const nextSessions = config.sessions.map((entry) =>
      entry.id === session.id
        ? setSessionTerminalProfile(entry, terminalProfileId)
        : entry
    );
    const next: AppConfig = {
      ...config,
      sessions: nextSessions,
    };
    setConfig(next);
    if (editingSession?.id === session.id) {
      setEditingSession(setSessionTerminalProfile(editingSession, terminalProfileId));
    }
    try {
      await configService.save(next);
      setStatus(t("status.sessionTerminalUpdated"));
    } catch (error) {
      setStatus(t("status.sessionSaveFailed"));
    }
  };

  const handleSwitchIdeProfile = async (
    session: SessionConfig,
    ideProfileId?: string
  ) => {
    const nextSessions = config.sessions.map((entry) =>
      entry.id === session.id ? setSessionIdeProfile(entry, ideProfileId) : entry
    );
    const next: AppConfig = {
      ...config,
      sessions: nextSessions,
    };
    setConfig(next);
    if (editingSession?.id === session.id) {
      setEditingSession(setSessionIdeProfile(editingSession, ideProfileId));
    }
    try {
      await configService.save(next);
      setStatus(t("status.sessionIdeUpdated"));
    } catch (error) {
      setStatus(t("status.sessionSaveFailed"));
    }
  };

  const handleSwitchClientType = async (
    session: SessionConfig,
    clientType: SessionClientType
  ) => {
    const nextSessions = config.sessions.map((entry) =>
      entry.id === session.id
        ? (() => {
            const nextSession = setSessionClientType(entry, clientType);
            const boundAccount = findBoundAccount(nextSession);
            if (clientType === "claude" && boundAccount?.type === "chatgpt") {
              return setSessionBoundAccount(nextSession, undefined);
            }
            return nextSession;
          })()
        : entry
    );
    const next: AppConfig = {
      ...config,
      sessions: nextSessions,
    };
    const nextSession = nextSessions.find((entry) => entry.id === session.id);
    setConfig(next);
    if (editingSession?.id === session.id) {
      const updatedEditingSession = nextSessions.find((entry) => entry.id === session.id);
      if (updatedEditingSession) {
        setEditingSession(updatedEditingSession);
      }
    }
    try {
      await configService.save(next);
      if (nextSession) {
        refreshLoginStatus(nextSession).catch(() => undefined);
      }
      setStatus(t("status.sessionClientUpdated"));
    } catch (error) {
      setStatus(t("status.sessionSaveFailed"));
    }
  };

  const handleCreateAccount = () => {
    const allowChatGPT = configScope === "codex";
    const account: AuthAccount = allowChatGPT
      ? {
          id: `account-${Date.now()}`,
          name: t("account.defaultName", { index: config.accounts.length + 1 }),
          type: "chatgpt",
          authJson: "",
        }
      : {
          id: `account-${Date.now()}`,
          name: t("account.defaultName", { index: config.accounts.length + 1 }),
          type: "api",
          apiKey: "",
        };
    setEditingAccount(account);
    setAccountEditorOpen(true);
  };

  const handleEditAccount = (account: AuthAccount) => {
    setEditingAccount(account);
    setAccountEditorOpen(true);
  };

  const handleSaveAccount = async (account: AuthAccount) => {
    const exists = config.accounts.some((entry) => entry.id === account.id);
    const nextAccounts = exists
      ? config.accounts.map((entry) => (entry.id === account.id ? account : entry))
      : [...config.accounts, account];
    const next: AppConfig = {
      ...config,
      accounts: nextAccounts,
    };

    setConfig(next);
    setAccountEditorOpen(false);
    setEditingAccount(null);

    try {
      await configService.save(next);
      setStatus(exists ? t("status.accountUpdated") : t("status.accountCreated"));
    } catch {
      setStatus(t("status.accountSaveFailed"));
    }
  };

  const handleDeleteAccount = async (account: AuthAccount) => {
    const confirmed = window.confirm(t("modal.delete.confirmAccount"));
    if (!confirmed) {
      return;
    }

    const next: AppConfig = {
      ...config,
      accounts: config.accounts.filter((entry) => entry.id !== account.id),
      sessions: config.sessions.map((session) =>
        session.boundAccountId === account.id
          ? setSessionBoundAccount(session, undefined)
          : session
      ),
    };

    setConfig(next);
    if (editingAccount?.id === account.id) {
      setEditingAccount(null);
      setAccountEditorOpen(false);
    }

    try {
      await configService.save(next);
      setStatus(t("status.accountDeleted"));
    } catch {
      setStatus(t("status.accountDeleteFailed"));
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
      const { binding, runtimeSession } = resolveRuntimeSession(session);
      const mergedEnv = sanitizeEnvForLoginType(binding.loginType, {
        ...(profile?.env ?? {}),
        ...(binding.env ?? {}),
      });
      if (resolvedHome && isCodexClient(runtimeSession)) {
        mergedEnv.CODEX_HOME = resolvedHome;
      }
      let configFailed = false;
      if (isCodexClient(runtimeSession)) {
        await ensureCodexRuntimeDefaults(resolvedHome ?? null);
        try {
          await writeCodexConfigFile(runtimeSession, resolvedHome ?? null);
          await writeCodexAuthFile(
            runtimeSession,
            resolvedHome ?? null,
            binding.authPayload
          );
        } catch (error) {
          configFailed = true;
        }
      } else {
        try {
          await writeClaudeConfigFiles(runtimeSession, resolvedHome ?? null);
        } catch (error) {
          configFailed = true;
        }
      }
      await invoke("launch_terminal", {
        app: profile?.command,
        args: profile?.args,
        workingDir: resolvedHome,
        command: session.launchCommand,
        env: Object.keys(mergedEnv).length ? mergedEnv : undefined,
      });
      if (binding.loginType === "chatgpt" && !binding.account) {
        refreshLoginStatus(session).catch(() => undefined);
      }
      if (configFailed) {
        setStatus(
          isCodexClient(runtimeSession)
            ? t("status.terminalOpenedConfigFailed")
            : t("status.claudeConfigWriteFailed", {
                prefix: t("status.terminalOpened"),
              })
        );
      } else {
        setStatus(t("status.terminalOpened"));
      }
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
    if (!isCodexClient(session) || !session.codexAppEnabled) {
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
      const { binding, runtimeSession } = resolveRuntimeSession(session);
      const mergedEnv = sanitizeEnvForLoginType(binding.loginType, {
        ...(binding.env ?? {}),
      });
      if (resolvedHome) {
        mergedEnv.CODEX_HOME = resolvedHome;
      }
      await ensureCodexRuntimeDefaults(resolvedHome ?? null);
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
        await writeCodexConfigFile(runtimeSession, resolvedHome ?? null);
        await writeCodexAuthFile(
          runtimeSession,
          resolvedHome ?? null,
          binding.authPayload
        );
      } catch (error) {
        configFailed = true;
      }
      await invoke("launch_codex_app", {
        appPath,
        userDataDir: ensuredUserDataDir ?? userDataDir,
        allowMultiple: session.codexAppAllowMultiple,
        env: Object.keys(mergedEnv).length ? mergedEnv : undefined,
      });
      if (binding.loginType === "chatgpt" && !binding.account) {
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
      const resolvedHome = await invoke<string>("ensure_codex_home", {
        path: session.codexHome,
      });
      const targetProjectPath = parseSessionProjectPath(session.launchCommand);
      const { binding, runtimeSession } = resolveRuntimeSession(session);
      const mergedEnv = sanitizeEnvForLoginType(binding.loginType, {
        ...(binding.env ?? {}),
      });
      if (resolvedHome && isCodexClient(runtimeSession)) {
        mergedEnv.CODEX_HOME = resolvedHome;
      }
      let configFailed = false;
      if (isCodexClient(runtimeSession)) {
        await ensureCodexRuntimeDefaults(resolvedHome ?? null);
        try {
          await writeCodexConfigFile(runtimeSession, resolvedHome ?? null);
          await writeCodexAuthFile(
            runtimeSession,
            resolvedHome ?? null,
            binding.authPayload
          );
        } catch (error) {
          configFailed = true;
        }
      } else {
        try {
          await writeClaudeConfigFiles(runtimeSession, resolvedHome ?? null);
        } catch (error) {
          configFailed = true;
        }
      }
      await invoke("launch_ide", {
        app: profile?.command ?? "Visual Studio Code",
        args: profile?.args,
        targetPath: targetProjectPath,
        env: Object.keys(mergedEnv).length ? mergedEnv : undefined,
        forceNewInstance:
          isCodexClient(runtimeSession) && binding.loginType === "api",
      });
      if (configFailed) {
        setStatus(
          isCodexClient(runtimeSession)
            ? t("status.ideOpenedConfigFailed")
            : t("status.claudeConfigWriteFailed", {
                prefix: t("status.ideOpened"),
              })
        );
      } else {
        setStatus(t("status.ideOpened"));
      }
    } catch (error) {
      setStatus(t("status.ideLaunchFailed"));
    }
  };

  const handleLogin = async (
    session: SessionConfig,
    profile?: TerminalProfile
  ) => {
    const { account, binding, runtimeSession } = resolveRuntimeSession(session);
    if (account) {
      setStatus(t("status.accountBoundLoginHint"));
      return;
    }
    if (binding.loginType !== "chatgpt") {
      setStatus(t("status.apiLoginHint"));
      return;
    }
    try {
      const resolvedHome = await invoke<string>("ensure_codex_home", {
        path: session.codexHome,
      });
      let configFailed = false;
      if (isCodexClient(runtimeSession)) {
        await ensureCodexRuntimeDefaults(resolvedHome ?? null);
        try {
          await writeCodexConfigFile(runtimeSession, resolvedHome ?? null);
          await writeCodexAuthFile(
            runtimeSession,
            resolvedHome ?? null,
            binding.authPayload
          );
        } catch (error) {
          configFailed = true;
        }
      } else {
        try {
          await writeClaudeConfigFiles(runtimeSession, resolvedHome ?? null);
        } catch (error) {
          configFailed = true;
        }
      }
      const officialLoginFlow = resolveOfficialLoginFlow(runtimeSession);
      if (officialLoginFlow === "terminal") {
        const loginCommand = resolveOfficialLoginCommand(runtimeSession);
        if (!loginCommand) {
          throw new Error("missing official login command");
        }
        if (profile?.command) {
          const installed = await invoke<boolean>("check_app_installed", {
            app: profile.command,
          });
          if (!installed) {
            await openUrl(resolveLoginUrl(session));
            setStatus(t("status.loginOpened"));
            return;
          }
        }
        const mergedEnv = sanitizeEnvForLoginType(binding.loginType, {
          ...(profile?.env ?? {}),
          ...(binding.env ?? {}),
        });
        if (resolvedHome && isCodexClient(runtimeSession)) {
          mergedEnv.CODEX_HOME = resolvedHome;
        }
        try {
          await invoke("launch_terminal", {
            app: profile?.command,
            args: profile?.args,
            workingDir: resolvedHome,
            command: loginCommand,
            env: Object.keys(mergedEnv).length ? mergedEnv : undefined,
          });
        } catch (terminalError) {
          await openUrl(resolveLoginUrl(session));
        }
        if (isCodexClient(runtimeSession)) {
          pollLoginStatus(session);
        }
      } else if (officialLoginFlow === "browser" || !isCodexClient(runtimeSession)) {
        await openUrl(resolveLoginUrl(session));
      }
      if (configFailed) {
        setStatus(
          isCodexClient(runtimeSession)
            ? t("status.loginOpenedConfigFailed")
            : t("status.claudeConfigWriteFailed", {
                prefix: t("status.loginOpened"),
              })
        );
      } else {
        setStatus(t("status.loginOpened"));
      }
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

  const handleSwitchConfigScope = (scope: ConfigScope) => {
    setEditorOpen(false);
    setEditingSession(null);
    setSearchValue("");
    setLoading(true);
    setConfigScope(scope);
    setStatus(
      t("status.configScopeSwitched", {
        scope:
          scope === "claude"
            ? t("action.configScopeClaude")
            : t("action.configScopeCodex"),
      })
    );
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
          <select
            className="field-input top-scope-select"
            value={configScope}
            onChange={(event) =>
              handleSwitchConfigScope(
                event.target.value === "claude" ? "claude" : "codex"
              )
            }
            aria-label={t("action.configScope")}
            title={t("action.configScope")}
          >
            <option value="codex">{t("action.configScopeCodex")}</option>
            <option value="claude">{t("action.configScopeClaude")}</option>
          </select>
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
              activeTab === "accounts"
                ? t("empty.accounts.action")
                : activeTab === "terminals"
                ? t("empty.terminals.action")
                : t("empty.ides.action")
            }
            onCreate={() =>
              activeTab === "accounts"
                ? handleCreateAccount()
                : handleCreateProfile(
                    activeTab === "terminals" ? "terminal" : "ide"
                  )
            }
            labels={{
              searchPlaceholder: t("profileToolbar.search.placeholder"),
              searchAria: t("profileToolbar.search.aria"),
              total: t("profileToolbar.total", {
                count:
                  activeTab === "accounts"
                    ? config.accounts.length
                    : activeTab === "terminals"
                    ? config.terminalProfiles.length
                    : config.ideProfiles.length,
              }),
              filtered: t("profileToolbar.show", {
                count:
                  activeTab === "accounts"
                    ? filteredAccounts.length
                    : activeTab === "terminals"
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
            accounts={config.accounts}
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
            onDuplicateSession={handleDuplicateSession}
            onSwitchClientType={handleSwitchClientType}
            onSwitchTerminalProfile={handleSwitchTerminalProfile}
            onSwitchIdeProfile={handleSwitchIdeProfile}
          />
        ) : null}

        {!loading && activeTab === "accounts" ? (
          <AccountBoard
            accounts={filteredAccounts}
            onCreateAccount={handleCreateAccount}
            onEditAccount={handleEditAccount}
            onDeleteAccount={(account) => {
              handleDeleteAccount(account).catch(() => undefined);
            }}
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

      <footer className="bottom-bar surface">
        <span className={`bottom-status bottom-status-${resolveStatusTone(status ?? "")}`}>
          {status ?? t("status.ready")}
        </span>
        <div className="bottom-actions">
          <button type="button" className="bottom-action-text" onClick={handleCheckUpdates}>
            {t("action.checkUpdates")}
          </button>
          <button type="button" className="bottom-action-text" onClick={handleOpenHelp}>
            {t("action.help")}
          </button>
        </div>
      </footer>

      {editingSession ? (
        <SessionEditor
          open={editorOpen}
          session={editingSession}
          isNew={
            !config.sessions.some((entry) => entry.id === editingSession.id)
          }
          terminalProfiles={config.terminalProfiles}
          ideProfiles={config.ideProfiles}
          accounts={config.accounts}
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

      {editingAccount ? (
        <AccountEditor
          open={accountEditorOpen}
          account={editingAccount}
          isNew={!config.accounts.some((entry) => entry.id === editingAccount.id)}
          allowChatGPT={configScope === "codex"}
          onSave={handleSaveAccount}
          onCancel={() => {
            setAccountEditorOpen(false);
            setEditingAccount(null);
          }}
          onDelete={
            config.accounts.some((entry) => entry.id === editingAccount.id)
              ? (accountId) => {
                  const found = config.accounts.find((entry) => entry.id === accountId);
                  if (found) {
                    handleDeleteAccount(found).catch(() => undefined);
                  }
                }
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
