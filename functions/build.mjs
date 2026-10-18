// Bundles src/ plus @steerly/shared, zod and date-fns into lib/index.js so Cloud Build
// never has to resolve the workspace package. Runtime deps in package.json stay external.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: 'lib/index.js',
  sourcemap: true,
  external: Object.keys(pkg.dependencies),
});
console.log('Built functions → lib/index.js');
