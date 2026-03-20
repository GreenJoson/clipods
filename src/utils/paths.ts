/**
 * @input  依赖：路径字符串
 * @output 导出：配置路径工具（默认与命名配置文件）
 * @pos    配置文件路径拼接（支持多配置文件隔离）
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
export const CONFIG_FILE_NAME = "config.toml";

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

export const buildConfigFilePath = (
  appConfigDir: string,
  fileName: string = CONFIG_FILE_NAME
): string => {
  if (!appConfigDir) {
    return fileName;
  }

  return `${trimTrailingSlash(appConfigDir)}/${fileName}`;
};
