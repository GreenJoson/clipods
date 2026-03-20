# services - 目录说明

> ⚠️ 一旦本文件夹有所变化，请更新本文件

| 文件名 | 地位 | 功能 |
|-------|------|------|
| _README.md | 文档 | 本目录说明 |
| configService.ts | 核心 | 配置加载与保存服务（支持 Codex/Claude 作用域隔离、legacy 回退与 AuthAccount/Session boundAccountId 解析） |
| codexConfig.ts | 核心 | Codex CLI config.toml 生成（clipods 标识、API 会话默认运行特性注入，如 `features.multi_agent`） |
| claudeConfig.ts | 核心 | Claude `settings.json` / `claude.json` 生成（支持开关与 JSON 覆盖） |
| accountBinding.ts | 核心 | 会话绑定账号的纯逻辑，决定登录模式、auth 负载与环境变量 |
| __tests__/configService.test.ts | 测试 | 配置服务 TOML 回环与配置文件隔离路径测试 |
| __tests__/codexConfig.test.ts | 测试 | Codex 配置生成逻辑测试 |
| __tests__/claudeConfig.test.ts | 测试 | Claude 配置文件生成与开关行为测试 |
