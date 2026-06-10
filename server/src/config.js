/** 童梦AI 服务端口配置 */
export const PORTS = {
  /** 主服务：API + Web + APK 下载 */
  SERVER: Number(process.env.PORT) || 9050,
  /** 开发前端 (Vite) */
  WEB_DEV: Number(process.env.WEB_DEV_PORT) || 9051,
};

export const APP_VERSION = '1.0.0';
export const APP_BUILD = '20260610';
