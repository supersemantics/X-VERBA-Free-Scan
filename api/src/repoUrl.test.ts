import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTarget, parseLsRemote, parseRepoUrl, resolveRef } from './repoUrl.js';

const repo = (owner: string, name: string, refSegments: string[] = [], refKind?: 'tree' | 'blob') =>
  refKind ? { owner, repo: name, refSegments, refKind } : { owner, repo: name, refSegments };

test('accepts every shape people paste for a whole repo', () => {
  const shapes = [
    'https://github.com/org/repo',
    'https://github.com/org/repo/',
    'https://github.com/org/repo.git',
    'http://www.github.com/org/repo',
    'github.com/org/repo',
    'www.github.com/org/repo',
    'org/repo',
    'org/repo/',
    '  https://github.com/org/repo  ',
    'git@github.com:org/repo.git',
    'https://github.com/org/repo?tab=readme-ov-file',
    'https://github.com/org/repo#readme',
    'https://github.com/org/repo/pulls',
    'https://github.com/org/repo/issues/12',
    'https://GitHub.com/org/repo',
  ];
  for (const s of shapes) assert.deepEqual(parseRepoUrl(s), repo('org', 'repo'), s);
});

test('keeps branch and folder segments for /tree/ and /blob/ links', () => {
  assert.deepEqual(parseRepoUrl('https://github.com/o/r/tree/main'), repo('o', 'r', ['main'], 'tree'));
  assert.deepEqual(parseRepoUrl('https://github.com/o/r/tree/demo/without-vsl/'), repo('o', 'r', ['demo', 'without-vsl'], 'tree'));
  assert.deepEqual(parseRepoUrl('https://github.com/o/r/tree/main/api?x=1'), repo('o', 'r', ['main', 'api'], 'tree'));
  assert.deepEqual(parseRepoUrl('https://github.com/o/r/blob/main/README.md'), repo('o', 'r', ['main', 'README.md'], 'blob'));
  assert.deepEqual(parseRepoUrl('https://github.com/o/r/tree/feature%2Fx'), repo('o', 'r', ['feature/x'].flatMap((s) => s.split('/')), 'tree'));
});

test('rejects non-GitHub, malformed and unsafe links', () => {
  const bad = [
    '',
    'repo',
    'https://gitlab.com/org/repo',
    'https://github.com.evil.com/org/repo',
    'https://evil.com/github.com/org/repo',
    'https://github.com/org',
    'ftp://github.com/org/repo',
    'file:///etc/passwd',
    'https://user:pw@github.com/org/repo',
    'https://github.com:8443/org/repo',
    'https://github.com/org/repo/tree/-upload-pack=x',
    'https://github.com/org/repo/tree/main/../../etc',
    'https://github.com/org/repo/tree/ma%ZZin',
    'https://github.com/org/re po',
    'org/repo/extra',
  ];
  for (const s of bad) assert.equal(parseRepoUrl(s), null, s);
});

test('resolveRef picks the longest branch prefix, rest is the folder', () => {
  const refs = new Set(['main', 'demo/without-vsl', 'demo', 'v1.0']);
  assert.deepEqual(resolveRef(repo('o', 'r'), refs), {});
  assert.deepEqual(resolveRef(repo('o', 'r', ['main'], 'tree'), refs), { branch: 'main', subdir: undefined });
  assert.deepEqual(resolveRef(repo('o', 'r', ['main', 'api', 'src'], 'tree'), refs), { branch: 'main', subdir: 'api/src' });
  assert.deepEqual(resolveRef(repo('o', 'r', ['demo', 'without-vsl'], 'tree'), refs), { branch: 'demo/without-vsl', subdir: undefined });
  assert.deepEqual(resolveRef(repo('o', 'r', ['demo', 'without-vsl', 'backend'], 'tree'), refs), {
    branch: 'demo/without-vsl',
    subdir: 'backend',
  });
  assert.deepEqual(resolveRef(repo('o', 'r', ['v1.0'], 'tree'), refs), { branch: 'v1.0', subdir: undefined });
  // A file link scans the file's branch, not the file.
  assert.deepEqual(resolveRef(repo('o', 'r', ['main', 'README.md'], 'blob'), refs), { branch: 'main', subdir: undefined });
  assert.equal(resolveRef(repo('o', 'r', ['nope', 'x'], 'tree'), refs), null);
});

test('buildTarget links into the scanned folder on the scanned branch', () => {
  const t = buildTarget(repo('o', 'r'), 'demo/without-vsl', 'backend/app');
  assert.equal(t.cloneUrl, 'https://github.com/o/r.git');
  assert.equal(t.displayName, 'r (demo/without-vsl: backend/app)');
  assert.equal(t.sourceBase, 'https://github.com/o/r/blob/demo/without-vsl/backend/app');
  const d = buildTarget(repo('o', 'r'));
  assert.equal(d.displayName, 'r');
  assert.equal(d.sourceBase, 'https://github.com/o/r/blob/HEAD');
});

test('parseLsRemote reads heads and tags, including peeled tags', () => {
  const out = [
    'abc\trefs/heads/main',
    'def\trefs/heads/demo/without-vsl',
    '123\trefs/tags/v1.0',
    '456\trefs/tags/v1.0^{}',
    '789\trefs/pull/1/head',
    '',
  ].join('\n');
  assert.deepEqual([...parseLsRemote(out)].sort(), ['demo/without-vsl', 'main', 'v1.0']);
});
