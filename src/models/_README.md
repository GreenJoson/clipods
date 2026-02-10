# models - 目录说明

> ⚠️ 一旦本文件夹有所变化，请更新本文件

| 文件名 | 地位 | 功能 |
|-------|------|------|
| _README.md | 文档 | 本目录说明 |
| session.ts | 核心 | Session 配置模型处理（含 Codex.app 字段归一化、终端/IDE 偏好更新与 launchCommand 项目路径解析） |
| session.test.ts | 测试 | Session 模型测试（终端/IDE 偏好切换与 `--cd` 项目路径提取） |
