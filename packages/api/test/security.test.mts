import { isOriginAllowed, bindHost } from '../server/security.mjs';

describe('isOriginAllowed', () => {
  const originalEnv = process.env.SRCBOOK_ALLOWED_ORIGINS;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.SRCBOOK_ALLOWED_ORIGINS;
    } else {
      process.env.SRCBOOK_ALLOWED_ORIGINS = originalEnv;
    }
  });

  it('allows requests with no Origin header', () => {
    // Browsers always set Origin on cross-origin requests, so an absent Origin
    // means a non-browser client: curl, the CLI's own fetch, a same-origin GET.
    expect(isOriginAllowed(undefined)).toBe(true);
    expect(isOriginAllowed('')).toBe(true);
  });

  it("allows the opaque 'null' origin", () => {
    // Sent for sandboxed iframes and file:// pages. Not attacker-controllable in
    // a way that matters here, and rejecting it breaks legitimate local usage.
    expect(isOriginAllowed('null')).toBe(true);
  });

  it('allows local origins on any port', () => {
    expect(isOriginAllowed('http://localhost:2150')).toBe(true);
    expect(isOriginAllowed('http://localhost:5173')).toBe(true);
    expect(isOriginAllowed('http://127.0.0.1:2150')).toBe(true);
    expect(isOriginAllowed('https://localhost:2150')).toBe(true);
    expect(isOriginAllowed('http://[::1]:2150')).toBe(true);
  });

  it('rejects remote origins', () => {
    expect(isOriginAllowed('https://evil.example.com')).toBe(false);
    expect(isOriginAllowed('http://evil.example.com:2150')).toBe(false);
    expect(isOriginAllowed('https://srcbook.com')).toBe(false);
  });

  it('rejects hostnames that merely contain a local hostname', () => {
    expect(isOriginAllowed('http://localhost.evil.com')).toBe(false);
    expect(isOriginAllowed('http://notlocalhost')).toBe(false);
    expect(isOriginAllowed('http://127.0.0.1.evil.com')).toBe(false);
  });

  it('rejects non-http schemes', () => {
    expect(isOriginAllowed('file://localhost')).toBe(false);
    expect(isOriginAllowed('chrome-extension://abcdef')).toBe(false);
  });

  it('rejects unparseable origins', () => {
    expect(isOriginAllowed('not a url')).toBe(false);
    expect(isOriginAllowed('://localhost')).toBe(false);
  });

  it('allows origins listed in SRCBOOK_ALLOWED_ORIGINS', () => {
    process.env.SRCBOOK_ALLOWED_ORIGINS =
      'https://notebooks.example.com, https://other.example.com';
    expect(isOriginAllowed('https://notebooks.example.com')).toBe(true);
    expect(isOriginAllowed('https://other.example.com')).toBe(true);
    expect(isOriginAllowed('https://unlisted.example.com')).toBe(false);
  });

  it('matches configured origins exactly, not by prefix', () => {
    process.env.SRCBOOK_ALLOWED_ORIGINS = 'https://example.com';
    expect(isOriginAllowed('https://example.com.evil.com')).toBe(false);
    expect(isOriginAllowed('https://example.com')).toBe(true);
  });
});

describe('bindHost', () => {
  const originalHost = process.env.HOST;

  afterEach(() => {
    if (originalHost === undefined) {
      delete process.env.HOST;
    } else {
      process.env.HOST = originalHost;
    }
  });

  it('defaults to loopback', () => {
    delete process.env.HOST;
    expect(bindHost()).toBe('127.0.0.1');
  });

  it('treats an empty HOST as unset', () => {
    process.env.HOST = '   ';
    expect(bindHost()).toBe('127.0.0.1');
  });

  it('honours an explicit HOST', () => {
    process.env.HOST = '0.0.0.0';
    expect(bindHost()).toBe('0.0.0.0');
  });
});
