/**
 * Database connection strings carry a password, so none may ever reach an
 * error message or a log line in full.
 *
 * Both Neon drivers do exactly that when the string is malformed: neon()
 * puts the whole string in its error message, and Pool throws Node's
 * "Invalid URL" TypeError, whose `input` property holds it. So the string is
 * checked here first, with an error that shows none of it, and any error from
 * the drivers is scrubbed before it is thrown on.
 */

const MESSAGE_HIDDEN = '(The value is not shown because it contains a password.)';

/**
 * Parses a postgres connection string or throws an error that says what is
 * wrong without repeating any of the value.
 */
export function checkConnectionString(url: string, name = 'DATABASE_URL'): URL {
  let parsed: URL | null = null;
  try {
    parsed = new URL(url.trim());
  } catch {
    // Deliberately not rethrown: Node's TypeError carries the input.
  }
  if (!parsed || (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:')) {
    throw new Error(`${name} must start with postgresql:// ${MESSAGE_HIDDEN}`);
  }
  if (!parsed.username || !parsed.hostname || parsed.pathname.length < 2) {
    throw new Error(`${name} must look like postgresql://user:password@host/database. ${MESSAGE_HIDDEN}`);
  }
  return parsed;
}

/** postgresql://user:***@host/database, safe to log. Unparseable input gives a placeholder. */
export function redactConnectionString(url: string): string {
  try {
    const parsed = new URL(url.trim());
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '<unparseable connection string>';
  }
}

/** The pieces of a connection string that must not appear anywhere. */
function secretsOf(url: string): string[] {
  const secrets = new Set<string>([url, url.trim()]);
  try {
    const { password } = new URL(url.trim());
    if (password) {
      secrets.add(password);
      try { secrets.add(decodeURIComponent(password)); } catch { /* not percent-encoded */ }
    }
  } catch {
    // Unparseable: only the whole string is known to be secret.
  }
  return [...secrets].filter((s) => s.length > 0).sort((a, b) => b.length - a.length);
}

function scrubText(text: string, secrets: string[]): string {
  let out = text;
  for (const secret of secrets) out = out.split(secret).join('***');
  return out;
}

/**
 * Removes the connection string and its password from an error before it is
 * thrown on: its message, stack, string properties (such as `input`), and its
 * cause and nested errors. Mutates and returns the same error, so its type and
 * other fields are kept for callers.
 */
export function scrubError<T>(error: T, url: string): T {
  const secrets = secretsOf(url);
  const seen = new Set<unknown>();
  const visit = (value: unknown, depth: number): unknown => {
    if (typeof value === 'string') return scrubText(value, secrets);
    if (!value || typeof value !== 'object' || seen.has(value) || depth > 5) return value;
    seen.add(value);
    const record = value as Record<string, unknown>;
    // message and stack are own but non-enumerable on Error, so name them.
    const keys = new Set([...Object.keys(record), 'message', 'stack', 'cause', 'errors']);
    for (const key of keys) {
      if (!(key in record)) continue;
      const before = record[key];
      const after = visit(before, depth + 1);
      if (after !== before) {
        try { record[key] = after; } catch { /* read-only field */ }
      }
    }
    return value;
  };
  return visit(error, 0) as T;
}
