/*
 * @input  依赖：tauri, tauri_plugin_opener, tauri_plugin_shell, tauri_plugin_fs, tauri_plugin_dialog, tauri_plugin_updater, serde_json, open 启动参数, Wave wsh, Ghostty 参数兼容转换
 * @output 导出：greet/launch_terminal/launch_ide/launch_codex_app/ensure_codex_home/ensure_codex_agents/ensure_codex_global_state/write_codex_config/write_codex_auth/check_codex_auth/check_app_installed/reveal_path 命令, run 启动函数（含 Wave 支持、Ghostty 兼容与 CODEX_HOME 归一化）
 * @pos    Tauri 后端命令与启动入口（含会话运行时默认自愈与终端参数兼容）
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::{
    collections::HashMap,
    env,
    fs,
    path::{Path, PathBuf},
    process::Command,
};
use serde_json::{Map, Value};

const DEFAULT_AGENTS_MD: &str = r#"---
name: execution-first
description: Keep execution visible and verifiable for coding tasks.
---

# Execution Rules

1. Execute implementation tasks directly unless the user explicitly asks for planning.
2. Provide short progress updates while working.
3. If the user asks to run a command, run it first and then answer with real output.
4. Never claim completion without verifiable evidence (changed files, command output, or test output).
5. If blocked, state the blocker and next step clearly.
"#;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn launch_terminal(
    app: Option<String>,
    args: Option<Vec<String>>,
    working_dir: Option<String>,
    command: Option<String>,
    env: Option<HashMap<String, String>>,
) -> Result<(), String> {
    let app_name = app
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "Terminal".to_string());
    let normalized_dir = match working_dir {
        Some(dir) => Some(normalize_path(&dir)?),
        None => None,
    };
    let command_line = build_command_line(&normalized_dir, env, command);
    if matches_terminal_app(&app_name) {
        return launch_terminal_script(&app_name, &command_line);
    }
    if matches_wave_app(&app_name) {
        return launch_wave_terminal(&app_name, &command_line, &normalized_dir, args);
    }
    let is_ghostty = matches_ghostty_app(&app_name);
    let mut open_args = vec!["-a".to_string(), app_name];
    if let Some(dir) = normalized_dir.as_ref() {
        if is_ghostty {
            // Ghostty on macOS does not accept opening a directory path via `open -a`.
            // Working directory is already handled in the shell command line.
        } else {
            open_args.push(path_to_string(dir)?);
        }
    }
    let mut filtered: Vec<String> = args
        .unwrap_or_default()
        .into_iter()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .map(|value| substitute_placeholders(&value, &command_line, &normalized_dir))
        .collect();
    if is_ghostty {
        filtered = normalize_ghostty_args(filtered, &command_line);
    }
    if !filtered.is_empty() {
        open_args.push("--args".to_string());
        open_args.extend(filtered);
    }
    run_open(&open_args)
}

#[tauri::command]
fn launch_ide(
    app: Option<String>,
    args: Option<Vec<String>>,
    target_path: Option<String>,
) -> Result<(), String> {
    let mut open_args: Vec<String> = Vec::new();
    if let Some(app_name) = app {
        let trimmed = app_name.trim().to_string();
        if !trimmed.is_empty() {
            open_args.push("-a".to_string());
            open_args.push(trimmed);
        }
    }
    if let Some(path) = target_path {
        let normalized = normalize_path(&path)?;
        open_args.push(path_to_string(&normalized)?);
    }
    if let Some(extra_args) = args {
        let filtered: Vec<String> = extra_args
            .into_iter()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .collect();
        if !filtered.is_empty() {
            open_args.push("--args".to_string());
            open_args.extend(filtered);
        }
    }
    if open_args.is_empty() {
        return Err("launch_ide requires an app name or target path".to_string());
    }
    run_open(&open_args)
}

#[tauri::command]
fn launch_codex_app(
    app_path: Option<String>,
    user_data_dir: Option<String>,
    allow_multiple: Option<bool>,
    env: Option<HashMap<String, String>>,
) -> Result<(), String> {
    let app_value = app_path
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "/Applications/Codex.app".to_string());
    let allow_multi = allow_multiple.unwrap_or(false);
    let env_map = env.unwrap_or_default();
    let normalized_app = if app_value.contains('/') || app_value.ends_with(".app") {
        Some(normalize_path(&app_value)?)
    } else {
        None
    };
    let normalized_user_dir = match user_data_dir {
        Some(value) if !value.trim().is_empty() => Some(normalize_path(&value)?),
        _ => None,
    };
    if let Some(app_bundle) = normalized_app.as_ref().filter(|path| {
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext == "app")
            .unwrap_or(false)
    }) {
        if let Some(executable) = resolve_app_executable(app_bundle) {
            let mut command = Command::new(executable);
            if !env_map.is_empty() {
                command.envs(env_map.iter());
            }
            if let Some(dir) = normalized_user_dir.as_ref() {
                command.arg("--user-data-dir").arg(dir);
            }
            command.spawn().map_err(|err| err.to_string())?;
            return Ok(());
        }
    }
    let mut open_args: Vec<String> = Vec::new();
    if allow_multi {
        open_args.push("-n".to_string());
    }
    open_args.push("-a".to_string());
    if let Some(path) = normalized_app.as_ref() {
        open_args.push(path_to_string(path)?);
    } else {
        open_args.push(app_value);
    }
    if let Some(dir) = normalized_user_dir.as_ref() {
        open_args.push("--args".to_string());
        open_args.push("--user-data-dir".to_string());
        open_args.push(path_to_string(dir)?);
    }
    run_open_with_env(&open_args, &env_map)
}

#[tauri::command]
fn ensure_codex_home(path: Option<String>) -> Result<String, String> {
    let fallback = "~/.codex".to_string();
    let selected = path
        .or_else(|| env::var("CODEX_HOME").ok())
        .unwrap_or(fallback);
    let resolved = normalize_path(&selected)?;
    fs::create_dir_all(&resolved).map_err(|err| err.to_string())?;
    path_to_string(&resolved)
}

#[tauri::command]
fn ensure_codex_agents(path: Option<String>) -> Result<String, String> {
    let fallback = "~/.codex".to_string();
    let selected = path
        .or_else(|| env::var("CODEX_HOME").ok())
        .unwrap_or(fallback);
    let resolved = normalize_path(&selected)?;
    fs::create_dir_all(&resolved).map_err(|err| err.to_string())?;
    let target = resolved.join("AGENTS.md");
    let should_write = match fs::metadata(&target) {
        Ok(meta) => meta.len() == 0,
        Err(err) => {
            if err.kind() == std::io::ErrorKind::NotFound {
                true
            } else {
                return Err(err.to_string());
            }
        }
    };
    if should_write {
        fs::write(&target, DEFAULT_AGENTS_MD).map_err(|err| err.to_string())?;
    }
    path_to_string(&target)
}

#[tauri::command]
fn ensure_codex_global_state(path: Option<String>) -> Result<String, String> {
    let fallback = "~/.codex".to_string();
    let selected = path
        .or_else(|| env::var("CODEX_HOME").ok())
        .unwrap_or(fallback);
    let resolved = normalize_path(&selected)?;
    fs::create_dir_all(&resolved).map_err(|err| err.to_string())?;
    let target = resolved.join(".codex-global-state.json");
    let existing = match fs::read_to_string(&target) {
        Ok(value) => value,
        Err(err) => {
            if err.kind() == std::io::ErrorKind::NotFound {
                "{}".to_string()
            } else {
                return Err(err.to_string());
            }
        }
    };
    let mut root: Map<String, Value> = match serde_json::from_str::<Value>(&existing) {
        Ok(Value::Object(object)) => object,
        _ => Map::new(),
    };
    if !root.contains_key("preventSleepWhileRunning") {
        root.insert("preventSleepWhileRunning".to_string(), Value::Bool(true));
    }
    if !root.contains_key("followUpQueueMode") {
        root.insert("followUpQueueMode".to_string(), Value::String("queue".to_string()));
    }
    if !root.contains_key("notifications-turn-mode") {
        root.insert(
            "notifications-turn-mode".to_string(),
            Value::String("always".to_string()),
        );
    }
    if !root.contains_key("thread-titles") {
        let mut titles = Map::new();
        titles.insert("titles".to_string(), Value::Object(Map::new()));
        titles.insert("order".to_string(), Value::Array(Vec::new()));
        root.insert("thread-titles".to_string(), Value::Object(titles));
    }
    if !root.contains_key("queued-follow-ups") {
        root.insert("queued-follow-ups".to_string(), Value::Object(Map::new()));
    }
    let serialized = serde_json::to_string(&Value::Object(root)).map_err(|err| err.to_string())?;
    fs::write(&target, serialized).map_err(|err| err.to_string())?;
    path_to_string(&target)
}

#[tauri::command]
fn write_codex_config(path: Option<String>, contents: String) -> Result<String, String> {
    let fallback = "~/.codex".to_string();
    let selected = path
        .or_else(|| env::var("CODEX_HOME").ok())
        .unwrap_or(fallback);
    let resolved = normalize_path(&selected)?;
    fs::create_dir_all(&resolved).map_err(|err| err.to_string())?;
    let target = resolved.join("config.toml");
    fs::write(&target, contents).map_err(|err| err.to_string())?;
    path_to_string(&target)
}

#[tauri::command]
fn write_codex_auth(path: Option<String>, contents: String) -> Result<String, String> {
    let fallback = "~/.codex".to_string();
    let selected = path
        .or_else(|| env::var("CODEX_HOME").ok())
        .unwrap_or(fallback);
    let resolved = normalize_path(&selected)?;
    fs::create_dir_all(&resolved).map_err(|err| err.to_string())?;
    let target = resolved.join("auth.json");
    fs::write(&target, contents).map_err(|err| err.to_string())?;
    path_to_string(&target)
}

#[tauri::command]
fn check_codex_auth(path: Option<String>) -> Result<String, String> {
    let fallback = "~/.codex".to_string();
    let selected = path
        .or_else(|| env::var("CODEX_HOME").ok())
        .unwrap_or(fallback);
    let resolved = normalize_path(&selected)?;
    let target = resolved.join("auth.json");
    let contents = match fs::read_to_string(&target) {
        Ok(value) => value,
        Err(err) => {
            if err.kind() == std::io::ErrorKind::NotFound {
                return Ok("missing".to_string());
            }
            return Err(err.to_string());
        }
    };
    if contents.contains("\"tokens\"") {
        return Ok("chatgpt".to_string());
    }
    if contents.contains("OPENAI_API_KEY") {
        return Ok("api".to_string());
    }
    Ok("missing".to_string())
}

#[tauri::command]
fn check_app_installed(app: String) -> Result<bool, String> {
    if app.trim().is_empty() {
        return Ok(false);
    }
    #[cfg(target_os = "macos")]
    {
        let status = Command::new("open")
            .args(["-Ra", app.trim()])
            .status()
            .map_err(|err| err.to_string())?;
        return Ok(status.success());
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        Ok(false)
    }
}

#[tauri::command]
fn reveal_path(path: String) -> Result<(), String> {
    let resolved = normalize_path(&path)?;
    let args = vec![
        "-R".to_string(),
        "--".to_string(),
        path_to_string(&resolved)?,
    ];
    run_open(&args)
}

fn resolve_app_executable(app_bundle: &Path) -> Option<PathBuf> {
    let app_name = app_bundle.file_stem()?.to_string_lossy().to_string();
    let candidate = app_bundle
        .join("Contents")
        .join("MacOS")
        .join(app_name);
    if candidate.exists() {
        Some(candidate)
    } else {
        None
    }
}

fn normalize_path(raw_path: &str) -> Result<PathBuf, String> {
    let expanded = expand_tilde(raw_path)?;
    if expanded.is_absolute() {
        return Ok(expanded);
    }
    let cwd = env::current_dir().map_err(|err| err.to_string())?;
    Ok(cwd.join(expanded))
}

fn expand_tilde(raw_path: &str) -> Result<PathBuf, String> {
    if raw_path == "~" {
        return home_dir();
    }
    if let Some(stripped) = raw_path.strip_prefix("~/") {
        return Ok(home_dir()?.join(stripped));
    }
    Ok(PathBuf::from(raw_path))
}

fn home_dir() -> Result<PathBuf, String> {
    env::var("HOME")
        .map(PathBuf::from)
        .map_err(|_| "HOME environment variable not set".to_string())
}

fn path_to_string(path: &Path) -> Result<String, String> {
    path.to_str()
        .map(|value| value.to_string())
        .ok_or_else(|| "Path contains invalid UTF-8".to_string())
}

fn build_command_line(
    working_dir: &Option<PathBuf>,
    env: Option<HashMap<String, String>>,
    command: Option<String>,
) -> Option<String> {
    let mut parts: Vec<String> = Vec::new();
    if let Some(dir) = working_dir {
        if let Ok(path) = path_to_string(dir) {
            parts.push(format!("cd {}", shell_escape(&path)));
        }
    }
    if let Some(mut env_map) = env {
        if let Some(dir) = working_dir {
            if let Ok(path) = path_to_string(dir) {
                env_map.insert("CODEX_HOME".to_string(), path);
            }
        }
        let mut entries: Vec<(String, String)> = env_map.into_iter().collect();
        entries.sort_by(|a, b| a.0.cmp(&b.0));
        for (key, value) in entries {
            if key.trim().is_empty() {
                continue;
            }
            parts.push(format!(
                "export {}={}",
                key.trim(),
                shell_escape(value.trim())
            ));
        }
    }
    if let Some(cmd) = command {
        let trimmed = cmd.trim();
        if !trimmed.is_empty() {
            parts.push(trimmed.to_string());
        }
    }
    if parts.is_empty() {
        None
    } else {
        Some(parts.join("; "))
    }
}

fn substitute_placeholders(
    value: &str,
    command_line: &Option<String>,
    working_dir: &Option<PathBuf>,
) -> String {
    let mut result = value.to_string();
    if let Some(command) = command_line {
        result = result.replace("{command}", command);
    }
    if let Some(dir) = working_dir {
        if let Ok(path) = path_to_string(dir) {
            result = result.replace("{cwd}", &path);
        }
    }
    result
}

fn shell_escape(value: &str) -> String {
    if value.is_empty() {
        return "''".to_string();
    }
    let escaped = value.replace('\'', "'\"'\"'");
    format!("'{}'", escaped)
}

fn escape_applescript(value: &str) -> String {
    value.replace('\\', "\\\\").replace('\"', "\\\"")
}

fn matches_terminal_app(app_name: &str) -> bool {
    let normalized = app_name.to_lowercase();
    normalized.contains("terminal") || normalized.contains("iterm")
}

fn matches_wave_app(app_name: &str) -> bool {
    let normalized = app_name.to_lowercase();
    normalized == "wave" || normalized == "waveterm" || normalized == "wave terminal"
}

fn matches_ghostty_app(app_name: &str) -> bool {
    app_name.to_lowercase().contains("ghostty")
}

fn normalize_ghostty_args(args: Vec<String>, command_line: &Option<String>) -> Vec<String> {
    let selected_shell = select_available_shell();
    if args.is_empty() {
        if let Some(cmd) = command_line.as_ref().map(|value| value.trim()) {
            if !cmd.is_empty() {
                return vec![
                    "-e".to_string(),
                    selected_shell,
                    "-lc".to_string(),
                    cmd.to_string(),
                ];
            }
        }
        return args;
    }

    let is_shell_wrapped =
        args.len() == 4 && args.first().map(|value| value == "-e").unwrap_or(false)
            && args.get(2).map(|value| value == "-lc").unwrap_or(false);
    if is_shell_wrapped {
        let shell_arg = args.get(1).map(|value| value.trim()).unwrap_or_default();
        if shell_arg.is_empty() || !Path::new(shell_arg).is_file() {
            return vec![
                "-e".to_string(),
                selected_shell,
                "-lc".to_string(),
                args.get(3).cloned().unwrap_or_default(),
            ];
        }
        return args;
    }

    let is_legacy_template =
        args.len() == 2 && args.first().map(|value| value == "-e").unwrap_or(false);
    if !is_legacy_template {
        return args;
    }

    let fallback = command_line
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string());
    let command_value = if args[1].trim().is_empty() {
        fallback
    } else {
        Some(args[1].trim().to_string())
    };

    match command_value {
        Some(value) => vec![
            "-e".to_string(),
            selected_shell,
            "-lc".to_string(),
            value,
        ],
        None => Vec::new(),
    }
}

fn select_available_shell() -> String {
    if let Ok(shell) = env::var("SHELL") {
        let trimmed = shell.trim();
        if !trimmed.is_empty() && Path::new(trimmed).is_file() {
            return trimmed.to_string();
        }
    }
    for candidate in ["/bin/zsh", "/bin/bash", "/bin/sh"] {
        if Path::new(candidate).is_file() {
            return candidate.to_string();
        }
    }
    "/bin/sh".to_string()
}

fn launch_terminal_script(app_name: &str, command_line: &Option<String>) -> Result<(), String> {
    let script = if app_name.to_lowercase().contains("iterm") {
        let command = command_line.clone().unwrap_or_else(|| "pwd".to_string());
        format!(
            "tell application \"iTerm\"\n\
               activate\n\
               if (count of windows) = 0 then\n\
                 create window with default profile\n\
               end if\n\
               tell current session of current window to write text \"{}\"\n\
             end tell",
            escape_applescript(&command)
        )
    } else {
        let command = command_line.clone().unwrap_or_else(|| "pwd".to_string());
        format!(
            "tell application \"Terminal\" to activate\n\
             tell application \"Terminal\" to do script \"{}\"",
            escape_applescript(&command)
        )
    };
    let output = Command::new("osascript")
        .args(["-e", &script])
        .output()
        .map_err(|err| err.to_string())?;
    if output.status.success() {
        Ok(())
    } else {
        let message = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if message.is_empty() {
            Err(format!("osascript failed with status: {}", output.status))
        } else {
            Err(message)
        }
    }
}

fn launch_wave_terminal(
    app_name: &str,
    command_line: &Option<String>,
    working_dir: &Option<PathBuf>,
    args: Option<Vec<String>>,
) -> Result<(), String> {
    let has_args = args.as_ref().map(|value| !value.is_empty()).unwrap_or(false);
    let mut open_args = vec!["-a".to_string(), app_name.to_string()];
    if let Some(dir) = working_dir.as_ref() {
        open_args.push(path_to_string(dir)?);
    }
    if let Some(extra_args) = args {
        let filtered: Vec<String> = extra_args
            .into_iter()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .collect();
        if !filtered.is_empty() {
            open_args.push("--args".to_string());
            open_args.extend(filtered);
        }
    }
    run_open(&open_args)?;
    let line = match command_line {
        Some(value) => value,
        None => return Ok(()),
    };
    if has_args {
        return Ok(());
    }
    let status = Command::new("wsh")
        .arg("run")
        .arg("--")
        .arg("/bin/bash")
        .arg("-lc")
        .arg(line)
        .status()
        .map_err(|err| err.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("wsh failed with status: {status}"))
    }
}

#[cfg(target_os = "macos")]
fn run_open(args: &[String]) -> Result<(), String> {
    let output = Command::new("open")
        .args(args)
        .output()
        .map_err(|err| err.to_string())?;
    if output.status.success() {
        Ok(())
    } else {
        let message = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if message.is_empty() {
            Err(format!("open failed with status: {}", output.status))
        } else {
            Err(message)
        }
    }
}

#[cfg(target_os = "macos")]
fn run_open_with_env(args: &[String], env: &HashMap<String, String>) -> Result<(), String> {
    if env.is_empty() {
        return run_open(args);
    }
    let output = Command::new("open")
        .args(args)
        .envs(env.iter())
        .output()
        .map_err(|err| err.to_string())?;
    if output.status.success() {
        Ok(())
    } else {
        let message = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if message.is_empty() {
            Err(format!("open failed with status: {}", output.status))
        } else {
            Err(message)
        }
    }
}

#[cfg(not(target_os = "macos"))]
fn run_open(_args: &[String]) -> Result<(), String> {
    Err("launchers are only supported on macOS".to_string())
}

#[cfg(not(target_os = "macos"))]
fn run_open_with_env(_args: &[String], _env: &HashMap<String, String>) -> Result<(), String> {
    Err("launchers are only supported on macOS".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            launch_terminal,
            launch_ide,
            launch_codex_app,
            ensure_codex_home,
            ensure_codex_agents,
            ensure_codex_global_state,
            write_codex_config,
            write_codex_auth,
            check_codex_auth,
            check_app_installed,
            reveal_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ghostty_empty_args_should_wrap_command_with_shell() {
        let args: Vec<String> = Vec::new();
        let command_line = Some(
            "cd '/tmp/demo'; export CODEX_HOME='/tmp/demo'; codex --cd /tmp/project".to_string(),
        );
        let shell = select_available_shell();
        let normalized = normalize_ghostty_args(args, &command_line);
        assert_eq!(
            normalized,
            vec![
                "-e".to_string(),
                shell,
                "-lc".to_string(),
                "cd '/tmp/demo'; export CODEX_HOME='/tmp/demo'; codex --cd /tmp/project"
                    .to_string()
            ]
        );
    }

    #[test]
    fn ghostty_legacy_e_command_args_should_wrap_command_with_shell() {
        let args = vec![
            "-e".to_string(),
            "cd '/tmp/demo'; export A='1'; codex --cd /tmp/project".to_string(),
        ];
        let command_line = None;
        let shell = select_available_shell();
        let normalized = normalize_ghostty_args(args, &command_line);
        assert_eq!(
            normalized,
            vec![
                "-e".to_string(),
                shell,
                "-lc".to_string(),
                "cd '/tmp/demo'; export A='1'; codex --cd /tmp/project".to_string()
            ]
        );
    }

    #[test]
    fn ghostty_invalid_shell_should_fallback_to_available_shell() {
        let args = vec![
            "-e".to_string(),
            "/not/exist/shell".to_string(),
            "-lc".to_string(),
            "echo ok".to_string(),
        ];
        let shell = select_available_shell();
        let normalized = normalize_ghostty_args(args, &None);
        assert_eq!(
            normalized,
            vec![
                "-e".to_string(),
                shell,
                "-lc".to_string(),
                "echo ok".to_string()
            ]
        );
    }
}
