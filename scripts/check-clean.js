import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'acorn';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = ['src', 'public', 'scripts', 'tests'];
const OUTPUT_FREE_DIRS = new Set(['src', 'public']);
const IGNORED = new Set(['node_modules', '.git']);

const OUTPUT_RULES = [
  { rule: 'console-output', pattern: /\bconsole\s*\./ },
  { rule: 'debugger-statement', pattern: /\bdebugger\b/ },
  { rule: 'direct-stream-output', pattern: /process\s*\.\s*(stdout|stderr)/ },
];

const EJS_RULES = [
  { rule: 'ejs-comment', pattern: /<%#/ },
  { rule: 'html-comment', pattern: /<!--/ },
  { rule: 'scriptlet-comment', pattern: /<%[^%]*(?:\/\/|\/\*)/ },
  { rule: 'inline-script', pattern: /<script\b(?![^>]*\bsrc=)/i },
  { rule: 'inline-style-attribute', pattern: /\sstyle\s*=/i },
  { rule: 'inline-event-handler', pattern: /\son[a-z]+\s*=/i },
  { rule: 'javascript-url', pattern: /javascript:/i },
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED.has(entry.name)) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

function scanJavaScript(file, source, topDir, violations) {
  const comments = [];
  try {
    parse(source, { ecmaVersion: 'latest', sourceType: 'module', onComment: comments });
  } catch {
    violations.push({ file, rule: 'parse-error' });
    return;
  }
  for (const comment of comments) {
    violations.push({ file, rule: 'comment', line: source.slice(0, comment.start).split('\n').length });
  }
  if (OUTPUT_FREE_DIRS.has(topDir)) {
    for (const { rule, pattern } of OUTPUT_RULES) {
      if (pattern.test(source)) {
        violations.push({ file, rule });
      }
    }
  }
}

function scanPatterns(file, source, rules, violations) {
  for (const { rule, pattern } of rules) {
    if (pattern.test(source)) {
      violations.push({ file, rule });
    }
  }
}

export function scan(root = ROOT) {
  const violations = [];
  for (const topDir of SCAN_DIRS) {
    const base = path.join(root, topDir);
    let files = [];
    try {
      files = walk(base);
    } catch {
      files = [];
    }
    for (const file of files) {
      const relative = path.relative(root, file);
      const extension = path.extname(file);
      const source = readFileSync(file, 'utf8');
      if (extension === '.js') {
        scanJavaScript(relative, source, topDir, violations);
      } else if (extension === '.css') {
        scanPatterns(relative, source, [{ rule: 'css-comment', pattern: /\/\*/ }], violations);
      } else if (extension === '.ejs' || extension === '.html') {
        scanPatterns(relative, source, EJS_RULES, violations);
      }
    }
  }
  return violations;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const violations = scan();
  if (violations.length > 0) {
    process.stderr.write(`${violations.map((v) => `${v.file}${v.line ? `:${v.line}` : ''} ${v.rule}`).join('\n')}\n`);
    process.exitCode = 1;
  }
}
