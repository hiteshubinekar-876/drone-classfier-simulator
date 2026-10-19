import { validateAiExplanation } from '../services/aiAarService';
import type { AiExplanation } from '../types/aarInsights';

export interface ServerRequest {
  method?: string;
  on(event: 'data', listener: (chunk: unknown) => void): unknown;
  on(event: 'end', listener: () => void): unknown;
  destroy?(): void;
}

export interface ServerResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(data?: string): void;
}

declare const process: {
  env: Record<string, string | undefined>;
};

export interface ProxyResponsePayload {
  error?: string;
  code?: string;
  details?: unknown;
}

/**
 * Handles incoming POST requests to /api/aar-explain on the server.
 * Reads server environment variables securely without exposing them to the client bundle.
 */
export async function handleAarProxyRequest(
  req: ServerRequest,
  res: ServerResponse
): Promise<void> {
  // 1. Method guard
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed. Use POST.', code: 'METHOD_NOT_ALLOWED' }));
    return;
  }

  // 2. Read request body with size limit (max 64KB)
  let rawBody = '';
  const MAX_BYTES = 64 * 1024;

  req.on('data', (chunk: unknown) => {
    rawBody += String(chunk);
    if (rawBody.length > MAX_BYTES) {
      res.statusCode = 413;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Payload Too Large', code: 'PAYLOAD_TOO_LARGE' }));
      req.destroy?.();
    }
  });

  req.on('end', async () => {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody || '{}');
    } catch {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid JSON payload in request body', code: 'INVALID_JSON' }));
      return;
    }

    // 3. Inspect server-side environment for credentials (NEVER prefixed with VITE_)
    const apiKey =
      process.env.AI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.AAR_AI_KEY ||
      null;

    const endpointUrl =
      process.env.AI_API_ENDPOINT ||
      process.env.OPENAI_BASE_URL ||
      process.env.AAR_AI_ENDPOINT ||
      (process.env.GEMINI_API_KEY
        ? 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
        : 'https://api.openai.com/v1/chat/completions');

    const modelName =
      process.env.AI_MODEL ||
      process.env.OPENAI_MODEL ||
      (process.env.GEMINI_API_KEY ? 'gemini-1.5-flash' : 'gpt-4o-mini');

    // 4. If server credentials are not configured, return 503 so client falls back safely
    if (!apiKey) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error:
            'Server AI proxy: AI_API_KEY (or GEMINI_API_KEY / OPENAI_API_KEY) is not configured in the server environment.',
          code: 'AI_UNCONFIGURED'
        })
      );
      return;
    }

    // 5. Execute secure server-side call to external LLM provider
    try {
      const explanation = await executeUpstreamLlmCall({
        apiKey,
        endpointUrl,
        modelName,
        payload
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(explanation));
    } catch (err: unknown) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: `Upstream LLM communication error: ${err instanceof Error ? err.message : String(err)}`,
          code: 'UPSTREAM_ERROR'
        })
      );
    }
  });
}

interface UpstreamCallParams {
  apiKey: string;
  endpointUrl: string;
  modelName: string;
  payload: Record<string, unknown>;
}

async function executeUpstreamLlmCall({
  apiKey,
  endpointUrl,
  modelName,
  payload
}: UpstreamCallParams): Promise<AiExplanation> {
  const isGemini = endpointUrl.includes('generativelanguage.googleapis.com');

  const systemInstructions = `You are a military UAS tactical After-Action Review (AAR) instructor.
Analyze the completed training session based SOLELY on the verified metrics and ground-truth evidence provided.
Do NOT fabricate contacts, scores, or false statistics.
Return ONLY a valid JSON object matching this exact schema:
{
  "performanceSummary": "concise executive paragraph summarizing trainee operational performance",
  "whatWentWell": ["evidence-backed strength 1", "evidence-backed strength 2"],
  "areasToImprove": ["measured deficiency 1", "measured deficiency 2"],
  "recommendedPractice": ["[PRIORITY] actionable practice drill 1", "[PRIORITY] drill 2"],
  "dataLimitations": ["data constraint note 1"]
}`;

  const promptContent = `Session Telemetry Summary:
${JSON.stringify(payload, null, 2)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    let response: Response;

    if (isGemini) {
      // Google Gemini REST API format
      const fullUrl = endpointUrl.includes('key=')
        ? endpointUrl
        : `${endpointUrl}${endpointUrl.includes('?') ? '&' : '?'}key=${apiKey}`;

      response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstructions}\n\n${promptContent}` }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        }),
        signal: controller.signal
      });
    } else {
      // OpenAI-compatible REST API format
      response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemInstructions },
            { role: 'user', content: promptContent }
          ]
        }),
        signal: controller.signal
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Upstream returned HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const rawResult = (await response.json()) as Record<string, unknown>;
    let jsonText = '';

    if (isGemini) {
      const candidates = rawResult.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      jsonText = candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      const choices = rawResult.choices as Array<{ message?: { content?: string } }>;
      jsonText = choices?.[0]?.message?.content || '';
    }

    const parsed = JSON.parse(jsonText);
    const validated = validateAiExplanation(parsed);

    return {
      ...validated,
      providerName: `Tactical AI Assistant (${modelName})`,
      isAiGenerated: true,
      generatedAt: Date.now()
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Vite plugin mounting the server proxy endpoint on both Vite dev server and preview server.
 */
export function aarAiProxyPlugin() {
  return {
    name: 'aar-ai-proxy',
    configureServer(server: { middlewares: { use: (path: string, fn: unknown) => void } }) {
      server.middlewares.use('/api/aar-explain', handleAarProxyRequest);
    },
    configurePreviewServer(server: { middlewares: { use: (path: string, fn: unknown) => void } }) {
      server.middlewares.use('/api/aar-explain', handleAarProxyRequest);
    }
  };
}
