# src - 前端源码

> ⚠️ 一旦本文件夹有所变化，请更新本文件

| 文件名 | 地位 | 功能 |
|-------|------|------|
| _README.md | 文档 | 本目录说明 |
| App.css | 核心 | 应用基础样式与品牌/版本呈现、账号池表单、顶部配置集切换控件、底部状态/文字操作栏与提示/确认弹窗样式 |
| App.tsx | 核心 | 应用主界面（含版本展示、顶部配置集隔离切换、账号池 CRUD、会话绑定账号、底部状态栏与文字入口、会话客户端/终端/IDE 快速切换持久化、Codex/Claude 客户端分流、新建会话默认目录按客户端切换、Claude `settings.json` / `claude.json` 可选写入、官方登录分流〔Codex/Claude 优先终端触发 OAuth，失败回退浏览器〕、Codex ChatGPT/API 与 Claude API 启动投影、IDE 环境隔离注入与 API 新实例启动、Codex.app 启动与多开隔离、AGENTS/global-state 自愈写入、多语言与主题切换、删除确认与 macOS 首次启动提示） |
| index.css | 核心 | 全局样式基线、排版与开发错误提示 |
| i18n.tsx | 核心 | 中英文切换与文案映射（含账号池、客户端切换、配置集切换、Claude 官方参数与 Claude 配置文件文案） |
| main.tsx | 核心 | 前端入口挂载与错误提示 |
| vite-env.d.ts | 支撑 | Vite 类型声明 |
| assets | 资源 | 前端静态资源 |
| blocks | 结构 | 页面块级模块（含账号列表区块） |
| components | 组件 | 可复用 UI 组件（含账号编辑器、会话高级 TOML 编辑与终端模板） |
| hooks | 逻辑 | React Hooks |
| models | 模型 | 数据模型 |
| services | 服务 | 业务服务层 |
| styles | 样式 | 主题与样式变量 |
| types | 类型 | 全局类型定义 |
| utils | 工具 | 工具函数 |
