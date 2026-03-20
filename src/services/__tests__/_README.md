# __tests__ - 服务层测试

> ⚠️ 一旦本文件夹有所变化，请更新本文件

| 文件名 | 地位 | 功能 |
|-------|------|------|
| _README.md | 文档 | 本目录说明 |
| accountBinding.test.ts | 测试 | 会话绑定账号的环境变量 / auth 投影测试（含 Codex ChatGPT/API 与 Claude API） |
| configService.test.ts | 测试 | 配置服务 TOML round-trip 测试 |
| codexConfig.test.ts | 测试 | Codex 配置生成逻辑测试（含 API 默认 features 注入〔`multi_agent`〕与冲突规避） |
| claudeConfig.test.ts | 测试 | Claude `settings.json` / `claude.json` 生成与开关测试 |
