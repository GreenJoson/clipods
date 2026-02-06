/*
 * @input  依赖：tauri, tauri_plugin_opener, tauri_plugin_shell, tauri_plugin_fs, tauri_plugin_dialog
 * @output 导出：greet/launch_terminal/launch_ide/ensure_codex_home/reveal_path 命令, run 启动函数
 * @pos    Tauri 后端命令与启动入口
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::{
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
fn launch_terminal(working_dir: Option<String>) -> Result<(), String> {
    let mut args = vec!["-a".to_string(), "Terminal".to_string()];
    if let Some(dir) = working_dir {
        let normalized = normalize_path(&dir)?;
        args.push("--".to_string());
        args.push(path_to_string(&normalized)?);
    }
    run_open(&args)
}

#[tauri::command]
fn launch_ide(app: Option<String>, target_path: Option<String>) -> Result<(), String> {
    let mut args: Vec<String> = Vec::new();
    if let Some(app_name) = app {
        args.push("-a".to_string());
        args.push(app_name);
    }
    if let Some(path) = target_path {
        let normalized = normalize_path(&path)?;
        args.push("--".to_string());
        args.push(path_to_string(&normalized)?);
    }
    if args.is_empty() {
        return Err("launch_ide requires an app name or target path".to_string());
    }
    run_open(&args)
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

#[cfg(target_os = "macos")]
fn run_open(args: &[String]) -> Result<(), String> {
    let status = Command::new("open")
        .args(args)
        .status()
        .map_err(|err| err.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("open failed with status: {status}"))
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
            reveal_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
