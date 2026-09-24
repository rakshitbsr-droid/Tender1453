// Freeze-safe dependency install for machines where antivirus behaviour monitoring (seen with
// Quick Heal) suspends `npm install` while it unpacks lucide-react: ~3,700 tiny files created in
// one folder within a second looks like ransomware, and the npm process is frozen for good.
//
// Workaround: unpack that one package slowly with tar (small chunks, short pauses), then let a
// normal `npm install` handle everything else -- it finds lucide-react already in place and skips it.
//
// Usage: npm run setup
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SLOW_PACKAGES = ['lucide-react'];
const CHUNK_SIZE = 100;
const PAUSE_MS = 1000;
const STEP_TIMEOUT_MS = 60_000;
const NPM_TIMEOUT_MS = 15 * 60_000;

// Windows ships bsdtar, which (unlike GNU tar) accepts C:\ paths.
const winTar = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe');
const TAR = process.platform === 'win32' && existsSync(winTar) ? winTar : 'tar';

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function fail(message) {
  console.error(`\n[setup] ${message}`);
  console.error(
    '[setup] If a step froze, antivirus is the likely cause. Add this project folder and\n' +
      '        %LOCALAPPDATA%\\npm-cache to its exclusion list, restart the PC to clear frozen\n' +
      '        node.exe processes, delete node_modules, and run `npm run setup` again.'
  );
  process.exit(1);
}

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout: STEP_TIMEOUT_MS, ...options });
  if (result.error?.code === 'ETIMEDOUT') fail(`Timed out (froze?) running: ${cmd} ${args.join(' ')}`);
  if (result.error) fail(`Could not run ${cmd}: ${result.error.message}`);
  if (result.status !== 0) fail(`${cmd} exited with code ${result.status}\n${result.stderr ?? ''}`);
  return result.stdout ?? '';
}

// npm is a .cmd shim on Windows, so it has to go through the shell; quote args because ^ is cmd's escape char.
function npm(args, options = {}) {
  const line = ['npm', ...args.map((a) => `"${a}"`)].join(' ');
  return run(line, [], { shell: true, ...options });
}

// Which versions the final `npm install` will accept without re-extracting the package (a fast
// re-extract is exactly what freezes): the locked version if there is a lockfile, else any version
// in the package.json range.
function wantedVersion(name, range) {
  const lockPath = path.join(ROOT, 'package-lock.json');
  if (existsSync(lockPath)) {
    const locked = JSON.parse(readFileSync(lockPath, 'utf8')).packages?.[`node_modules/${name}`]?.version;
    if (locked) return { spec: locked, accepts: (v) => v === locked };
  }
  const matching = [].concat(JSON.parse(npm(['view', `${name}@${range}`, 'version', '--json'], { timeout: 2 * 60_000 })));
  return { spec: range, accepts: (v) => matching.includes(v) };
}

function isInstalled(name, accepts) {
  const dir = path.join(ROOT, 'node_modules', name);
  const manifest = path.join(dir, 'package.json');
  if (!existsSync(manifest) || !accepts(JSON.parse(readFileSync(manifest, 'utf8')).version)) return false;
  const icons = path.join(dir, 'dist', 'esm', 'icons');
  return !existsSync(icons) || readdirSync(icons).length > 1000; // reject a half-unpacked copy
}

function installSlowly(name, range) {
  const { spec, accepts } = wantedVersion(name, range);
  if (isInstalled(name, accepts)) {
    console.log(`[setup] ${name} already present, skipping`);
    return;
  }

  const work = mkdtempSync(path.join(tmpdir(), 'tender-setup-'));
  try {
    console.log(`[setup] downloading ${name}@${spec}`);
    npm(['pack', `${name}@${spec}`, '--pack-destination', work, '--loglevel=error'], { timeout: 5 * 60_000 });
    const tarball = path.join(work, readdirSync(work).find((f) => f.endsWith('.tgz')));

    const files = run(TAR, ['-tzf', tarball]).split(/\r?\n/).filter((f) => f && !f.endsWith('/'));
    const dest = path.join(ROOT, 'node_modules', name);
    rmSync(dest, { recursive: true, force: true }); // drop a stale or half-unpacked copy
    mkdirSync(dest, { recursive: true });

    const chunks = Math.ceil(files.length / CHUNK_SIZE);
    console.log(`[setup] unpacking ${files.length} files in ${chunks} small batches (about ${Math.round((chunks * (PAUSE_MS + 1500)) / 1000)}s)`);
    const listFile = path.join(work, 'chunk.txt');
    for (let i = 0; i < chunks; i++) {
      writeFileSync(listFile, files.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE).join('\n') + '\n');
      run(TAR, ['-xzf', tarball, '--strip-components=1', '-C', dest, '-T', listFile]);
      if ((i + 1) % 10 === 0 || i + 1 === chunks) console.log(`[setup]   ${i + 1}/${chunks}`);
      sleep(PAUSE_MS);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const ranges = { ...pkg.devDependencies, ...pkg.dependencies };

for (const name of SLOW_PACKAGES) {
  if (ranges[name]) installSlowly(name, ranges[name]);
}

console.log('[setup] installing remaining dependencies with npm');
npm(['install', '--no-audit', '--no-fund'], { stdio: 'inherit', timeout: NPM_TIMEOUT_MS });

console.log('\n[setup] done. Start the app with: npm run dev');
