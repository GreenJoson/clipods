/**
 * @input  依赖：globalThis
 * @output 导出：无（运行时全局兼容补丁）
 * @pos    浏览器端 Node 风格 global 兼容入口
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */

if (typeof globalThis !== "undefined") {
  const globalKey = "global" as const;
  const target = globalThis as typeof globalThis & { global?: typeof globalThis };
  if (typeof target[globalKey] === "undefined") {
    target[globalKey] = globalThis;
  }
}
