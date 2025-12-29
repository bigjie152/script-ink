import { getRequestContext } from "@cloudflare/next-on-pages";

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiConfig = {
  provider: "deepseek" | "google";
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
  const provider = (readEnv("AI_PROVIDER") ?? "google").trim().toLowerCase();

  if (provider === "google" || provider === "gemini") {
    const apiKey = readEnv("AI_API_KEY") ?? readEnv("GEMINI_API_KEY") ?? readEnv("GOOGLE_API_KEY") ?? "";
    if (!apiKey) return null;
    const baseUrl = readEnv("AI_BASE_URL") ?? "https://generativelanguage.googleapis.com/v1beta";
    const model = readEnv("AI_MODEL") ?? "gemini-3-flash-preview";
    return { provider: "google", apiKey, baseUrl, model };
  }

  if (provider === "deepseek") {
    const apiKey = readEnv("AI_API_KEY") ?? readEnv("DEEPSEEK_API_KEY") ?? "";
    if (!apiKey) return null;
    const baseUrl = readEnv("AI_BASE_URL") ?? "https://api.deepseek.com/v1";
    const model = readEnv("AI_MODEL") ?? "deepseek-reasoner";
    return { provider: "deepseek", apiKey, baseUrl, model };
  }

  return null;
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

const splitMessages = (messages: AiMessage[]) => {
  const systemText = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const userMessages = messages.filter((message) => message.role === "user");
  return { systemText, userMessages };
};

export const requestGoogle = async (config: AiConfig, messages: AiMessage[]) => {
  const { systemText, userMessages } = splitMessages(messages);
  const contents = userMessages.map((message) => ({
    role: "user",
    parts: [{ text: message.content }],
  }));

  const response = await fetch(
    `${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: systemText ? { parts: [{ text: systemText }] } : undefined,
        contents,
        generationConfig: { temperature: 0.7 },
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google AI Studio error: ${response.status} ${detail}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part.text ?? "").join("");
};

export const requestGoogleStream = async (config: AiConfig, messages: AiMessage[]) => {
  const { systemText, userMessages } = splitMessages(messages);
  const contents = userMessages.map((message) => ({
    role: "user",
    parts: [{ text: message.content }],
  }));

  const response = await fetch(
    `${config.baseUrl}/models/${config.model}:streamGenerateContent?alt=sse&key=${config.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: systemText ? { parts: [{ text: systemText }] } : undefined,
        contents,
        generationConfig: { temperature: 0.7 },
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google AI Studio error: ${response.status} ${detail}`);
  }

  if (!response.body) {
    throw new Error("Google AI Studio stream is unavailable.");
  }

  return response.body;
};
