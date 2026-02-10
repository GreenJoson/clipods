# src - 前端源码

> ⚠️ 一旦本文件夹有所变化，请更新本文件

| 文件名 | 地位 | 功能 |
|-------|------|------|
| _README.md | 文档 | 本目录说明 |
| App.css | 核心 | 应用基础样式与品牌/版本呈现、提示/确认弹窗样式 |
| App.tsx | 核心 | 应用主界面（含版本展示、更新检查、帮助入口、会话终端/IDE 快速切换持久化、IDE 环境隔离注入、Codex.app 启动与多开隔离、AGENTS/global-state 自愈写入、多语言与主题切换、删除确认与 macOS 首次启动提示） |
| index.css | 核心 | 全局样式基线、排版与开发错误提示 |
| i18n.tsx | 核心 | 中英文切换与文案映射 |
| main.tsx | 核心 | 前端入口挂载与错误提示 |
| vite-env.d.ts | 支撑 | Vite 类型声明 |
| assets | 资源 | 前端静态资源 |
| blocks | 结构 | 页面块级模块 |
| components | 组件 | 可复用 UI 组件（含会话高级 TOML 编辑与终端模板） |
| hooks | 逻辑 | React Hooks |
| models | 模型 | 数据模型 |
| services | 服务 | 业务服务层 |
| styles | 样式 | 主题与样式变量 |
| types | 类型 | 全局类型定义 |
| utils | 工具 | 工具函数 |
