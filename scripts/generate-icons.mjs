#!/usr/bin/env node
/** 从 tongmeng-logo.svg 生成 Android 与 Web 用 PNG 图标 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'web/package.json'));
const { Resvg } = require('@resvg/resvg-js');

const SVG_PATH = path.join(ROOT, 'tongmeng-logo.svg');
const ANDROID_RES = path.join(ROOT, 'web/android/app/src/main/res');
const PUBLIC_DIR = path.join(ROOT, 'web/public');

const svg = fs.readFileSync(SVG_PATH, 'utf8');

function png(size) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  return resvg.render().asPng();
}

function write(filePath, buffer) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

const DENSITIES = [
  { dir: 'mipmap-mdpi', launcher: 48, fg: 108 },
  { dir: 'mipmap-hdpi', launcher: 72, fg: 162 },
  { dir: 'mipmap-xhdpi', launcher: 96, fg: 216 },
  { dir: 'mipmap-xxhdpi', launcher: 144, fg: 324 },
  { dir: 'mipmap-xxxhdpi', launcher: 192, fg: 432 },
];

for (const d of DENSITIES) {
  const base = path.join(ANDROID_RES, d.dir);
  const icon = png(d.launcher);
  write(path.join(base, 'ic_launcher.png'), icon);
  write(path.join(base, 'ic_launcher_round.png'), icon);
  write(path.join(base, 'ic_launcher_foreground.png'), png(d.fg));
}

write(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), png(180));
write(path.join(PUBLIC_DIR, 'favicon-192.png'), png(192));
write(path.join(PUBLIC_DIR, 'icon.png'), png(1024));

console.log('✅ 图标 PNG 已生成（Android mipmap + web/public）');
