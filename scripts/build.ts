import { build, context, type BuildOptions } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');
const options: BuildOptions = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  target: ['es2022'],
  outfile: 'dist/game.js',
  sourcemap: true,
  logLevel: 'info',
};
if (process.argv.includes('--serve')) {
  const compiler = await context(options);
  await compiler.watch();
  const server = await compiler.serve({ servedir: 'dist', host: '127.0.0.1', port: 4173 });
  console.log(`Игра: http://127.0.0.1:${server.port}`);
} else {
  await build({ ...options, minify: true });
}
