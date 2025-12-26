export const SESSION_COOKIE = "si_session";

export const clampScore = (value: number) => {
  const safe = Number.isFinite(value) ? value : 1;
  return Math.min(5, Math.max(1, safe));
};

export const normalizeTags = (raw: string) => {
  const candidates = raw
    .split(/[#\s,，]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  const unique = new Set<string>();
  for (const tag of candidates) {
    if (tag.length > 0 && tag.length <= 24) {
      unique.add(tag);
    }
  }
  return Array.from(unique);
};

export const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const computeHotScore = (average: number, count: number) => {
  if (count <= 0) return 0;
  const weight = count / (count + 3);
  return average * weight;
};
