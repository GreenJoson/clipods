/**
 * @input  依赖：Vitest 配置 API
 * @output 导出：测试运行配置
 * @pos    测试配置入口（排除项）
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.git/**",
      "**/.worktrees/**",
    ],
  },
});
