/*
 * @input  依赖：codex_launcher_lib::run
 * @output 导出：应用主进程入口
 * @pos    Tauri 主进程启动
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    codex_launcher_lib::run()
}
