import { build } from 'esbuild';
import { mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, 'dist');

if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const entries = {
  'http/createRoom': 'src/http/createRoom.ts',
  'http/joinRoom': 'src/http/joinRoom.ts',
  'http/getRoom': 'src/http/getRoom.ts',
  'ws/connect': 'src/ws/connect.ts',
  'ws/disconnect': 'src/ws/disconnect.ts',
  'ws/default': 'src/ws/default.ts',
};

for (const [name, entry] of Object.entries(entries)) {
  const bundleOut = resolve(outDir, name, 'index.mjs');
  await build({
    entryPoints: [resolve(__dirname, entry)],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    outfile: bundleOut,
    sourcemap: true,
    minify: false,
    banner: {
      js: "import { createRequire as topLevelCreateRequire } from 'module'; const require = topLevelCreateRequire(import.meta.url);",
    },
    external: [],
    logLevel: 'info',
  });
}

console.log(`Built ${Object.keys(entries).length} lambdas into ${outDir}`);
