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

export type GoogleAiResult = {
  text: string;
  blockReason?: string;
  finishReason?: string;
};

const readEnv = (key: string) => {
  const context = getRequestContext();
  const env = (context?.env ?? {}) as Record<string, string | undefined>;
  return env[key] ?? process.env[key];
};

export const getAiConfig = (): AiConfig | null => {
  // DeepSeek code is kept but disabled; only Google AI Studio is used.
  const apiKey = readEnv("AI_API_KEY") ?? readEnv("GEMINI_API_KEY") ?? readEnv("GOOGLE_API_KEY") ?? "";
  if (!apiKey) return null;
  const baseUrlCandidate = readEnv("GEMINI_BASE_URL") ?? readEnv("AI_BASE_URL") ?? "";
  const modelCandidate = readEnv("GEMINI_MODEL") ?? readEnv("AI_MODEL") ?? "";
  const baseUrl = baseUrlCandidate.includes("googleapis.com")
    ? baseUrlCandidate
    : "https://generativelanguage.googleapis.com/v1beta";
  const model = modelCandidate.startsWith("gemini")
    ? modelCandidate
    : "gemini-3-flash-preview";
  return { provider: "google", apiKey, baseUrl, model };
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

export const requestGoogle = async (config: AiConfig, messages: AiMessage[]): Promise<GoogleAiResult> => {
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
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    promptFeedback?: { blockReason?: string };
  };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return {
    text: parts.map((part) => part.text ?? "").join(""),
    blockReason: data.promptFeedback?.blockReason,
    finishReason: data.candidates?.[0]?.finishReason,
  };
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
