import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The reminder server in `api/` runs in plain Node, which resolves an import
 * exactly as written: `./dates` is a file called `dates`, and there isn't one.
 * Vite and vitest are forgiving about this, so a missing `.js` passes every
 * other check and then brings the server down on Vercel with nothing but
 * FUNCTION_INVOCATION_FAILED.
 *
 * That is precisely what happened to `/api/remind`, so this walks the real
 * import graph and insists on the extension, rather than trusting a README.
 */

const root = resolve(__dirname, '..', '..');

/** Relative imports, minus the `import type` ones that compile away to nothing. */
function relativeImports(source: string): string[] {
  const withoutTypes = source.replace(/import\s+type\s+[^;]*?;/gs, '');
  return [...withoutTypes.matchAll(/(?:from|import)\s*['"](\.[^'"]*)['"]/g)].map((m) => m[1]);
}

function resolveImport(fromFile: string, spec: string): string | null {
  const base = join(dirname(fromFile), spec.replace(/\.js$/, ''));
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** Every file the server really loads, following imports from `api/`. */
function serverFiles(): string[] {
  const entries = ['api/remind.ts', 'api/push-test.ts', 'api/_push.ts', 'api/ics.ts', 'api/_ics.ts']
    .map((f) => join(root, f))
    .filter(existsSync);
  const seen = new Set<string>();
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of relativeImports(readFileSync(file, 'utf8'))) {
      const next = resolveImport(file, spec);
      if (next) queue.push(next);
    }
  }
  return [...seen];
}

describe('what the reminder server loads', () => {
  it('spells every relative import with .js, so Node can resolve it', () => {
    const offenders: string[] = [];
    for (const file of serverFiles()) {
      for (const spec of relativeImports(readFileSync(file, 'utf8'))) {
        if (!spec.endsWith('.js')) offenders.push(`${relative(root, file)} imports '${spec}'`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('reaches the files it is supposed to, so the walk above means something', () => {
    const files = serverFiles().map((f) => relative(root, f).replace(/\\/g, '/'));
    expect(files).toContain('src/lib/reminders.ts');
    expect(files).toContain('src/store/selectors.ts');
    expect(files).toContain('src/lib/habitDays.ts');
  });
});
