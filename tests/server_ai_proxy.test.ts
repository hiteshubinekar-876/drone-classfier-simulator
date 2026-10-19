import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleAarProxyRequest, ServerRequest, ServerResponse } from '../src/server/aiProxyHandler';

declare const process: {
  env: Record<string, string | undefined>;
};

function createMockHttpReqRes(options: {
  method?: string;
  body?: string;
}): {
  req: ServerRequest;
  res: ServerResponse;
  getResponse: () => { statusCode: number; headers: Record<string, string>; body: string; json: () => unknown };
} {
  const dataListeners: Array<(chunk: unknown) => void> = [];
  const endListeners: Array<() => void> = [];

  const req: ServerRequest = {
    method: options.method || 'POST',
    on(event: string, listener: unknown) {
      if (event === 'data') dataListeners.push(listener as (chunk: unknown) => void);
      if (event === 'end') endListeners.push(listener as () => void);
      return this;
    },
    destroy() {}
  };

  const headers: Record<string, string> = {};
  let responseData = '';

  const res: ServerResponse = {
    statusCode: 200,
    setHeader(key: string, value: string) {
      headers[key.toLowerCase()] = value;
    },
    end(data?: string) {
      if (data) responseData += data;
    }
  };

  setTimeout(() => {
    if (options.body !== undefined) {
      for (const fn of dataListeners) fn(options.body);
    }
    for (const fn of endListeners) fn();
  }, 0);

  return {
    req,
    res,
    getResponse: () => ({
      statusCode: res.statusCode,
      headers,
      body: responseData,
      json: () => JSON.parse(responseData)
    })
  };
}

describe('Server-Side AI Proxy Handler (/api/aar-explain)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.AI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.AAR_AI_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('rejects GET or non-POST requests with HTTP 405 Method Not Allowed', async () => {
    const { req, res, getResponse } = createMockHttpReqRes({ method: 'GET' });
    await handleAarProxyRequest(req, res);

    const resp = getResponse();
    expect(resp.statusCode).toBe(405);
    expect(resp.json()).toHaveProperty('code', 'METHOD_NOT_ALLOWED');
  });

  it('returns HTTP 503 when AI_API_KEY is not configured on the server', async () => {
    const { req, res, getResponse } = createMockHttpReqRes({
      method: 'POST',
      body: JSON.stringify({ scenario: 'Test Scenario', authoritativeScore: 85 })
    });

    await handleAarProxyRequest(req, res);
    await new Promise((resolve) => setTimeout(resolve, 20));

    const resp = getResponse();
    expect(resp.statusCode).toBe(503);
    const bodyJson = resp.json() as Record<string, unknown>;
    expect(bodyJson).toHaveProperty('code', 'AI_UNCONFIGURED');
    expect(String(bodyJson.error)).toContain('AI_API_KEY');
  });

  it('rejects malformed JSON body with HTTP 400 Bad Request', async () => {
    const { req, res, getResponse } = createMockHttpReqRes({
      method: 'POST',
      body: 'invalid-json{{'
    });

    await handleAarProxyRequest(req, res);
    await new Promise((resolve) => setTimeout(resolve, 20));

    const resp = getResponse();
    expect(resp.statusCode).toBe(400);
    expect(resp.json()).toHaveProperty('code', 'INVALID_JSON');
  });

  it('successfully forwards to upstream LLM and returns validated schema when AI_API_KEY is configured', async () => {
    process.env.AI_API_KEY = 'sk-mock-server-key';

    const mockLlmResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              performanceSummary: 'Server proxy validated: Exemplary observation skills demonstrated.',
              whatWentWell: ['Rapid acquisition of hostile assets', 'Zero unverified triggers'],
              areasToImprove: ['Fine-tune horizontal panning on fast targets'],
              recommendedPractice: ['Conduct high-velocity fixed-wing drills'],
              dataLimitations: ['Server-side LLM generated']
            })
          }
        }
      ]
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => mockLlmResponse
    });
    vi.stubGlobal('fetch', fetchMock);

    const { req, res, getResponse } = createMockHttpReqRes({
      method: 'POST',
      body: JSON.stringify({
        scenario: 'Border Outpost Recon',
        authoritativeScore: 90,
        metrics: { totalTargets: 3, totalAttempts: 3 }
      })
    });

    await handleAarProxyRequest(req, res);
    await new Promise((resolve) => setTimeout(resolve, 30));

    const resp = getResponse();
    expect(resp.statusCode).toBe(200);
    const resultJson = resp.json() as Record<string, unknown>;
    expect(resultJson.isAiGenerated).toBe(true);
    expect(String(resultJson.performanceSummary)).toContain('Server proxy validated');
    expect(Array.isArray(resultJson.whatWentWell)).toBe(true);
  });

  it('returns HTTP 502 when upstream LLM fails or returns non-200', async () => {
    process.env.AI_API_KEY = 'sk-mock-server-key';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized invalid API key'
    });
    vi.stubGlobal('fetch', fetchMock);

    const { req, res, getResponse } = createMockHttpReqRes({
      method: 'POST',
      body: JSON.stringify({ scenario: 'Test' })
    });

    await handleAarProxyRequest(req, res);
    await new Promise((resolve) => setTimeout(resolve, 30));

    const resp = getResponse();
    expect(resp.statusCode).toBe(502);
    expect(resp.json()).toHaveProperty('code', 'UPSTREAM_ERROR');
  });
});
