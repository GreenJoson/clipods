/*
 * @input  依赖：tauri, tauri_plugin_opener, tauri_plugin_shell, tauri_plugin_fs, tauri_plugin_dialog, open 启动参数, Wave wsh
 * @output 导出：greet/launch_terminal/launch_ide/ensure_codex_home/write_codex_config/write_codex_auth/check_codex_auth/check_app_installed/reveal_path 命令, run 启动函数（含 Wave 支持与 CODEX_HOME 归一化）
 * @pos    Tauri 后端命令与启动入口
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
    let mut open_args = vec!["-a".to_string(), app_name];
    if let Some(dir) = normalized_dir.as_ref() {
        open_args.push(path_to_string(dir)?);
    }
    if let Some(extra_args) = args {
        let filtered: Vec<String> = extra_args
            .into_iter()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .map(|value| substitute_placeholders(&value, &command_line, &normalized_dir))
            .collect();
        if !filtered.is_empty() {
            open_args.push("--args".to_string());
            open_args.extend(filtered);
        }
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

#[cfg(not(target_os = "macos"))]
fn run_open(_args: &[String]) -> Result<(), String> {
    Err("launchers are only supported on macOS".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            launch_terminal,
            launch_ide,
            ensure_codex_home,
            write_codex_config,
            write_codex_auth,
            check_codex_auth,
            check_app_installed,
            reveal_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
