// Puts the site online. It takes the staging branch as it is on GitHub, moves the main branch
// forward to it (so main is always the version online) and uploads that version to the server
// of the Politecnico (Apache, SFTP only, from its VPN) with rclone (https://rclone.org).
// Builds the site, saves a copy of what is online in deploy-backups/, shows what will change and
// asks before touching main or the server. Only the folder of the site (htdocs/) is touched.
// Setup and restore: docs/developer-guide.md, "Publishing the site".
//
//   npm run deploy                     build, show the changes, ask, move main, back up, upload
//   npm run deploy -- --dry-run        build and show the changes only
//   node scripts/deploy.mjs --dry-run  the same
//
// Environment (optional):
//   DEPLOY_TARGET   rclone remote and folder of the site, default "qubito:htdocs"
//   RCLONE          path of the rclone program, when it is not on the PATH

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
const target = process.env.DEPLOY_TARGET || 'qubito:htdocs';
const rclone = process.env.RCLONE || 'rclone';
// PowerShell may drop the "--" of "npm run deploy -- --dry-run": npm then keeps --dry-run for
// itself and passes it on only as npm_config_dry_run.
const dryRun = process.argv.includes('--dry-run') || process.env.npm_config_dry_run === 'true';
/** Space on the server. */
const MAX_BYTES = 1024 ** 3;
/** Files that a complete build always has. */
const REQUIRED = ['index.html', '404.html', 'en/404/index.html', '.htaccess', 'sitemap-index.xml'];
/**
 * Folders on the server that are not part of this site, never compared, overwritten or deleted:
 * the QubiTO Hackathon site (built on its own, in the hackathon/ folder of the team's repo).
 */
const KEEP = ['/hackathon/**'].flatMap((folder) => ['--exclude', folder]);

const fail = (message) => {
  console.error(`\n${message}`);
  process.exit(1);
};

/** Runs rclone; with `capture` returns its output instead of showing it. */
const run = (args, { capture = false } = {}) => {
  const result = spawnSync(rclone, args, {
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    fail(
      `rclone not found (${result.error.message}). Install it (https://rclone.org/install/) ` +
        'or set RCLONE to the path of rclone.exe.',
    );
  }
  return result;
};

/** Runs git in the folder of the site and returns its output. */
const git = (...args) => {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.error) fail(`git not found (${result.error.message}).`);
  return { ok: result.status === 0, out: result.stdout.trim(), err: result.stderr.trim() };
};

// The target must be the folder of the site: a sync deletes every file that is not in dist/.
if (
  target
    .replace(/[\\/]+$/, '')
    .split(/[\\/:]/)
    .pop() !== 'htdocs'
) {
  fail(`DEPLOY_TARGET must be the htdocs folder of the site, not "${target}".`);
}
run(['version'], { capture: true });

// What goes online is the staging branch as it is on GitHub, the one the team has seen on the
// preview: not a local copy with other changes.
if (git('rev-parse', '--abbrev-ref', 'HEAD').out !== 'staging') {
  fail('Run the upload from the staging branch: git switch staging, git pull, then run it again.');
}
console.log('Reading the staging and main branches from GitHub...');
const fetched = git(
  'fetch',
  '--quiet',
  'origin',
  '+refs/heads/staging:refs/remotes/origin/staging',
  '+refs/heads/main:refs/remotes/origin/main',
);
if (!fetched.ok) fail(`Cannot read the branches from GitHub:\n${fetched.err}`);
if (git('status', '--porcelain', '--', '.').out !== '') {
  fail(
    'There are changes in website/ that are not committed. Commit and push them to staging and ' +
      'check them on the preview, or set them aside; then run the upload again.',
  );
}
const head = git('rev-parse', 'HEAD').out;
if (head !== git('rev-parse', 'origin/staging').out) {
  const [behind, ahead] = git('rev-list', '--left-right', '--count', 'origin/staging...HEAD')
    .out.split(/\s+/)
    .map(Number);
  if (ahead === 0)
    fail('Your staging branch is behind GitHub: run git pull, then the upload again.');
  fail(
    `Your staging branch has ${ahead} commit(s) that are not on GitHub` +
      (behind > 0 ? ', and GitHub has others: run git pull, then push' : ': push them') +
      ', check the preview, then run the upload again.',
  );
}
// main already holds this version (for example after a pull request from staging), or it moves
// forward to it. If main has something that staging doesn't, staging has to take it first.
const moveMain = git('rev-parse', 'origin/main^{tree}').out !== git('rev-parse', 'HEAD^{tree}').out;
if (moveMain) {
  if (!git('merge-base', '--is-ancestor', 'origin/main', head).ok) {
    fail(
      "main has commits that staging doesn't have. Bring them into staging first " +
        '(git merge origin/main, then push), check the preview, then run the upload again.',
    );
  }
  const count = git('rev-list', '--count', `origin/main..${head}`).out;
  console.log(`main will move forward to staging: ${count} new commit(s).`);
} else {
  console.log('main already holds this version of staging.');
}

console.log('\nBuilding the site...');
if (spawnSync('npm run build', { cwd: root, stdio: 'inherit', shell: true }).status !== 0) {
  fail('The build failed: nothing was uploaded.');
}
const missing = REQUIRED.filter((file) => !existsSync(join(dist, file)));
if (missing.length > 0) fail(`The build is incomplete, missing: ${missing.join(', ')}.`);
const files = readdirSync(dist, { recursive: true, withFileTypes: true }).filter((entry) =>
  entry.isFile(),
);
const bytes = files.reduce(
  (sum, entry) => sum + statSync(join(entry.parentPath, entry.name)).size,
  0,
);
console.log(`\nBuild: ${files.length} files, ${(bytes / 1024 ** 2).toFixed(1)} MB.`);
if (bytes > MAX_BYTES) fail('The site is larger than the 1 GB allowed on the server.');

console.log(`Reading ${target}...`);
if (run(['lsf', target, '--max-depth', '1'], { capture: true }).status !== 0) {
  fail(`Cannot reach ${target}: is the VPN of the Politecnico connected?`);
}

// Differences by size: the build rewrites every file, so their dates always differ.
const report = run(['check', dist, target, '--size-only', '--combined', '-', ...KEEP], {
  capture: true,
});
const changes = { '+': [], '*': [], '-': [], '=': [], '!': [] };
for (const line of report.stdout.split(/\r?\n/)) {
  const list = changes[line[0]];
  if (list && line[1] === ' ') list.push(line.slice(2));
}
const compared = changes['+'].length + changes['*'].length + changes['='].length;
if (compared === 0 || changes['!'].length > 0) {
  fail(`rclone could not compare the build with ${target}:\n${report.stderr}`);
}
const kept = changes['='].filter((file) => file.startsWith('_astro/')).length;
console.log(
  `\nNew files: ${changes['+'].length}. Different size: ${changes['*'].length}. ` +
    `Unchanged in _astro/ (skipped): ${kept}. Other files, uploaded again: ` +
    `${changes['='].length - kept}. To delete: ${changes['-'].length}.`,
);
if (changes['-'].length > 0) {
  const shown = changes['-'].slice(0, 40);
  console.log(`Files on the server that are not in the build, to delete:\n  ${shown.join('\n  ')}`);
  if (changes['-'].length > shown.length) {
    console.log(`  ... and ${changes['-'].length - shown.length} more`);
  }
}
if (dryRun) {
  console.log('\nDry run: nothing was uploaded and main was not changed.');
  process.exit(0);
}

const reader = createInterface({ input: stdin, output: stdout });
const answer = await reader.question(
  `\n${moveMain ? 'Move main to staging and upload' : 'Upload'} the site to ${target}? ` +
    'Type "yes" to continue: ',
);
reader.close();
if (answer.trim().toLowerCase() !== 'yes') fail('Nothing was uploaded and main was not changed.');

if (moveMain) {
  console.log('\nMoving main to staging on GitHub...');
  // Without --force, git and GitHub accept only a move forward: main can never lose commits.
  if (
    spawnSync('git', ['push', 'origin', `${head}:refs/heads/main`], { cwd: root, stdio: 'inherit' })
      .status !== 0
  ) {
    fail(
      'GitHub did not accept the update of main (see the message above): nothing was uploaded.\n' +
        'If main is protected, ask an admin of the repository, or open a pull request from staging ' +
        'to main on GitHub, merge it with "Create a merge commit", then run the upload again.',
    );
  }
}

// Local date and time, e.g. 2026-10-24-14-30-05 (the Swedish format is the ISO one).
const stamp = new Date().toLocaleString('sv-SE').replace(/[: ]/g, '-');
const backup = join(root, 'deploy-backups', stamp);
console.log(`\nSaving a copy of what is online in deploy-backups/${stamp}/ ...`);
if (run(['copy', target, backup, '--progress']).status !== 0) {
  fail('The copy of the site online failed: nothing was uploaded.');
}

// New files first, then the pages that use them; old files are deleted last, so that the site
// keeps working during the upload. Files in _astro/ change name whenever their content changes,
// so an existing one is skipped; the other files are always uploaded (a page can change without
// changing size, and the server may not keep the dates of the files).
const steps = [
  [
    'Uploading the new files of _astro/',
    ['copy', join(dist, '_astro'), `${target}/_astro`, '--size-only'],
  ],
  [
    'Uploading the pages and the other files',
    ['copy', dist, target, '--exclude', '/_astro/**', ...KEEP, '--ignore-times'],
  ],
  ['Deleting the files that are not in the build', ['sync', dist, target, '--size-only', ...KEEP]],
];
for (const [label, args] of steps) {
  console.log(`\n${label}...`);
  if (run([...args, '--progress']).status !== 0) {
    fail(
      `The upload stopped (${label.toLowerCase()}). Run it again, or restore the copy:\n` +
        `  rclone sync "${backup}" ${target} --exclude "/hackathon/**"`,
    );
  }
}

console.log(
  `\nDone. The copy of the previous site is in deploy-backups/${stamp}/.\n` +
    'Open https://qubito.polito.it/ and check a few pages. If the server answers with error 500, ' +
    `it does not accept .htaccess: delete it with\n  rclone deletefile ${target}/.htaccess\n` +
    'and tell the IT of the Politecnico.',
);
