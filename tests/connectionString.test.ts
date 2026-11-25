import { inspect } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { Pool, neon } from '@neondatabase/serverless';
import { checkConnectionString, redactConnectionString, scrubError } from '@/lib/connectionString';
import { openTransaction, systemQuery } from '@/lib/dbDriver';

// A connection string must never reach an error or a log line in full.
// "S3cretPw" stands in for the password; nothing here touches a network.
const PW = 'S3cretPw';
const GOOD = `postgresql://kinly_app:${PW}@ep-x-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require`;
const BAD = {
  'no scheme': `kinly_app:${PW}@ep-x-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require`,
  'quoted': `"${GOOD}"`,
  'host only': `ep-x-pooler.us-east-1.aws.neon.tech/neondb?user=kinly_app&password=${PW}`,
  'wrong scheme': `https://kinly_app:${PW}@ep-x.neon.tech/neondb`,
  'no database': `postgresql://kinly_app:${PW}@ep-x.neon.tech`,
  'no user': `postgresql://ep-x.neon.tech/neondb?password=${PW}`,
};

/** Everything a logger could print for this error: message, stack, fields, cause. */
function printed(error: unknown): string {
  return inspect(error, { depth: 10, showHidden: true }) + String((error as Error)?.stack ?? '');
}

async function errorOf(fn: () => unknown): Promise<unknown> {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error('expected an error');
}

describe('checkConnectionString', () => {
  it('accepts a normal Neon URL', () => {
    expect(checkConnectionString(GOOD).hostname).toBe('ep-x-pooler.us-east-1.aws.neon.tech');
    expect(checkConnectionString(`postgres://u:p@h/db`).username).toBe('u');
  });

  for (const [name, url] of Object.entries(BAD)) {
    it(`rejects ${name} without showing any of it`, async () => {
      const error = await errorOf(() => checkConnectionString(url));
      expect((error as Error).message).toMatch(/^DATABASE_URL must/);
      expect(printed(error)).not.toContain(PW);
      expect(printed(error)).not.toContain('ep-x');
    });
  }

  it('names the variable it was given', async () => {
    const error = await errorOf(() => checkConnectionString(BAD['no scheme'], 'DATABASE_URL_OWNER'));
    expect((error as Error).message).toMatch(/^DATABASE_URL_OWNER must start with postgresql:\/\//);
  });
});

describe('redactConnectionString', () => {
  it('keeps everything but the password', () => {
    expect(redactConnectionString(GOOD)).toBe(
      'postgresql://kinly_app:***@ep-x-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
    );
    expect(redactConnectionString(BAD['host only'])).toBe('<unparseable connection string>');
  });
});

describe('scrubError', () => {
  it('removes the string and password from message, stack, fields and causes', () => {
    const inner = Object.assign(new TypeError('Invalid URL'), { input: GOOD, code: 'ERR_INVALID_URL' });
    const error = new Error(`could not connect with ${GOOD} (password ${PW})`, { cause: inner });
    const aggregate = new AggregateError([error], `failed: ${PW}`);

    const out = scrubError(aggregate, GOOD);
    expect(out).toBe(aggregate);
    expect(printed(out)).not.toContain(PW);
    expect(error.message).toBe('could not connect with *** (password ***)');
    expect(inner.input).toBe('***');
    expect(inner.code).toBe('ERR_INVALID_URL');
    expect(inner).toBeInstanceOf(TypeError);
  });

  it('also removes a percent-encoded password in either form', () => {
    const url = 'postgresql://u:p%40ss%2Fword@h/db';
    const error = new Error('p%40ss%2Fword and p@ss/word');
    expect(scrubError(error, url).message).toBe('*** and ***');
  });

  it('copes with cycles and plain values', () => {
    const error: Error & { self?: unknown } = new Error(PW);
    error.self = error;
    expect(scrubError(error, GOOD).message).toBe('***');
    expect(scrubError(`text ${PW}`, GOOD)).toBe('text ***');
    expect(scrubError(null, GOOD)).toBeNull();
  });
});

describe('the drivers themselves leak (why this exists)', () => {
  it('neon() and Pool put a malformed string into their errors', async () => {
    expect(printed(await errorOf(() => neon(BAD['no scheme'])))).toContain(PW);
    const pool = new Pool({ connectionString: BAD['no scheme'] });
    expect(printed(await errorOf(() => pool.connect()))).toContain(PW);
    await pool.end().catch(() => {});
  });
});

describe('dbDriver with a malformed DATABASE_URL', () => {
  const original = process.env.DATABASE_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  });

  for (const [name, url] of Object.entries(BAD)) {
    it(`never shows the string (${name})`, async () => {
      process.env.DATABASE_URL = url;
      for (const error of [await errorOf(() => systemQuery('SELECT 1')), await errorOf(() => openTransaction('x'))]) {
        expect((error as Error).message).toMatch(/^DATABASE_URL must/);
        expect(printed(error)).not.toContain(PW);
      }
    });
  }
});
