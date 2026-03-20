# models - 目录说明

> ⚠️ 一旦本文件夹有所变化，请更新本文件

| 文件名 | 地位 | 功能 |
|-------|------|------|
| _README.md | 文档 | 本目录说明 |
| session.ts | 核心 | Session 配置模型处理（含客户端类型归一化/切换、boundAccountId 绑定、默认会话目录、官方登录流向/命令判定、Claude 配置字段、Codex.app 字段、终端/IDE 偏好与 launchCommand 路径解析） |
| session.test.ts | 测试 | Session 模型测试（客户端类型默认值与切换、默认会话目录、官方登录流向/命令判定、终端/IDE 偏好切换与 `--cd` 项目路径提取） |
