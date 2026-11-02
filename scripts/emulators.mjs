// Starts the local Firebase emulators (offline demo project "demo-steerly").
// Firebase CLI needs Java 21+. If the default `java` is older, this looks for a JDK 21+ in the usual
// places (JAVA_HOME, %LOCALAPPDATA%\Programs\jdk21\*, Program Files) and uses it for this run only.
// Extra args are passed through, e.g. `npm run emulators -- --only auth,firestore`.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { delimiter, join } from 'node:path';

const exe = process.platform === 'win32' ? 'java.exe' : 'java';

function javaMajor(javaBin) {
  // `java -version` prints to stderr, so read both streams.
  const r = spawnSync(javaBin, ['-version'], { encoding: 'utf8' });
  if (r.error) return 0;
  return parseMajor(`${r.stderr ?? ''}${r.stdout ?? ''}`);
}
function parseMajor(text) {
  const m = /version "(\d+)(?:\.(\d+))?/.exec(text);
  if (!m) return 0;
  return m[1] === '1' ? Number(m[2]) : Number(m[1]); // "1.8" style → 8
}

function candidateHomes() {
  const homes = [];
  if (process.env.JAVA_HOME) homes.push(process.env.JAVA_HOME);
  const roots = [
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs', 'jdk21'),
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs'),
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Java',
    'C:\\Program Files\\Microsoft',
  ].filter(Boolean);
  for (const root of roots) {
    if (!existsSync(root)) continue;
    if (existsSync(join(root, 'bin', exe))) homes.push(root);
    for (const d of readdirSync(root, { withFileTypes: true })) {
      if (d.isDirectory() && /jdk|java|temurin/i.test(d.name)) homes.push(join(root, d.name));
    }
  }
  return homes;
}

const env = { ...process.env };
env.FUNCTIONS_DISCOVERY_TIMEOUT ??= '60'; // OneDrive makes the first functions load slow

if (javaMajor('java') < 21) {
  const home = candidateHomes().find((h) => existsSync(join(h, 'bin', exe)) && javaMajor(join(h, 'bin', exe)) >= 21);
  if (!home) {
    console.error(
      'Java 21 or newer is required by the Firebase emulators, and none was found.\n' +
        'Install it (e.g. Eclipse Temurin 21) or set JAVA_HOME to a JDK 21+ folder, then run this again.',
    );
    process.exit(1);
  }
  env.JAVA_HOME = home;
  env.PATH = `${join(home, 'bin')}${delimiter}${env.PATH ?? env.Path ?? ''}`;
  env.Path = env.PATH;
  console.log(`Using Java ${javaMajor(join(home, 'bin', exe))} from ${home}`);
}

const extra = process.argv.slice(2);
const args = ['firebase', 'emulators:start', '--project', 'demo-steerly'];
if (!extra.includes('--only')) args.push('--only', 'auth,functions,firestore,storage');
args.push(...extra);

const child = spawn('npx', args, { stdio: 'inherit', env, shell: process.platform === 'win32' });
child.on('exit', (code) => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
