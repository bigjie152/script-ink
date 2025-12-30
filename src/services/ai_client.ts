import { getRequestContext } from "@cloudflare/next-on-pages";

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiConfig = {
  provider: "deepseek";
  apiKey: string;
  baseUrl: string;
  model: string;
};

const readEnv = (key: string) => {
  const context = getRequestContext();
  const env = (context?.env ?? {}) as Record<string, string | undefined>;
  return env[key] ?? process.env[key];
};

export const getAiConfig = (): AiConfig | null => {
  const provider = (readEnv("AI_PROVIDER") ?? "deepseek").trim().toLowerCase();
  if (provider !== "deepseek") return null;
  const apiKey = readEnv("AI_API_KEY") ?? readEnv("DEEPSEEK_API_KEY") ?? "";
  if (!apiKey) return null;
  const baseUrl = readEnv("AI_BASE_URL") ?? "https://api.deepseek.com/v1";
  const model = readEnv("AI_MODEL") ?? "deepseek-reasoner";
  return { provider: "deepseek", apiKey, baseUrl, model };
};

export const requestDeepSeek = async (config: AiConfig, messages: AiMessage[]) => {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`DeepSeek API error: ${response.status} ${detail}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
};

export const requestDeepSeekStream = async (config: AiConfig, messages: AiMessage[]) => {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`DeepSeek API error: ${response.status} ${detail}`);
  }

  if (!response.body) {
    throw new Error("DeepSeek API stream is unavailable.");
  }

  return response.body;
};
