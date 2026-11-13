import {
  applyFrontendUrl,
  resolveFrontendUrl,
  PRODUCTION_SITE_URL,
} from './public-url';

describe('resolveFrontendUrl', () => {
  it('replaces a localhost address on a hosted server', () => {
    for (const url of [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://localhost',
      'http://localhost:3000/',
      '',
    ]) {
      expect(resolveFrontendUrl({ RENDER: 'true', FRONTEND_URL: url })).toBe(
        PRODUCTION_SITE_URL,
      );
    }
    expect(resolveFrontendUrl({ RENDER: 'true' })).toBe(PRODUCTION_SITE_URL);
    expect(
      resolveFrontendUrl({
        NODE_ENV: 'production',
        FRONTEND_URL: 'http://localhost:3000',
      }),
    ).toBe(PRODUCTION_SITE_URL);
  });

  it('keeps a real address, such as the demo site, and trims a trailing slash', () => {
    expect(
      resolveFrontendUrl({
        RENDER: 'true',
        FRONTEND_URL: 'https://demo.eventecos.com/',
      }),
    ).toBe('https://demo.eventecos.com');
    expect(
      resolveFrontendUrl({
        RENDER: 'true',
        FRONTEND_URL: 'https://www.eventecos.com',
      }),
    ).toBe('https://www.eventecos.com');
  });

  it('leaves local development alone', () => {
    expect(resolveFrontendUrl({ FRONTEND_URL: 'http://localhost:3000' })).toBe(
      'http://localhost:3000',
    );
    expect(resolveFrontendUrl({})).toBeUndefined();
  });

  it('does not treat a lookalike hostname as localhost', () => {
    expect(
      resolveFrontendUrl({
        RENDER: 'true',
        FRONTEND_URL: 'https://localhost.example.com',
      }),
    ).toBe('https://localhost.example.com');
  });
});

describe('applyFrontendUrl', () => {
  it('rewrites the environment only when it had to', () => {
    const bad: NodeJS.ProcessEnv = {
      RENDER: 'true',
      FRONTEND_URL: 'http://localhost:3000',
    };
    expect(applyFrontendUrl(bad)).toBe(PRODUCTION_SITE_URL);
    expect(bad.FRONTEND_URL).toBe(PRODUCTION_SITE_URL);

    const good: NodeJS.ProcessEnv = {
      RENDER: 'true',
      FRONTEND_URL: 'https://www.eventecos.com',
    };
    expect(applyFrontendUrl(good)).toBeNull();
  });
});
