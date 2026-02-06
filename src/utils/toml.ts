/**
 * @input  依赖：@iarna/toml
 * @output 导出：TOML 解析与序列化工具
 * @pos    TOML IO 的基础工具层
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import * as toml from "@iarna/toml";

export type TomlData = toml.JsonMap;

export const parseToml = (source: string): TomlData =>
  toml.parse(source) as TomlData;

export const stringifyToml = (data: TomlData): string => toml.stringify(data);
