const PHONE_REGEX = /(\+?\d[\d\s\-()]{6,}\d)/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const CARD_REGEX = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
const URL_REGEX = /https?:\/\/[^\s]+/gi;
const TELEGRAM_REGEX = /@[a-zA-Z0-9_]{3,32}\b/g;
const WHATSAPP_REGEX = /whats\s*app/gi;

interface FilterResult {
  filtered: string;
  hasSensitiveContent: boolean;
}

const MASK = "***";

export function filterSensitiveContent(text: string): FilterResult {
  let filtered = text;
  let hasSensitiveContent = false;

  const patterns = [
    { regex: CARD_REGEX },
    { regex: EMAIL_REGEX },
    { regex: PHONE_REGEX },
    { regex: URL_REGEX },
    { regex: TELEGRAM_REGEX },
    { regex: WHATSAPP_REGEX },
  ];

  for (const { regex } of patterns) {
    if (regex.test(filtered)) {
      hasSensitiveContent = true;
      filtered = filtered.replace(regex, MASK);
    }
    regex.lastIndex = 0;
  }

  return { filtered, hasSensitiveContent };
}

export function containsSensitiveContent(text: string): boolean {
  const patterns = [CARD_REGEX, EMAIL_REGEX, PHONE_REGEX, URL_REGEX, TELEGRAM_REGEX, WHATSAPP_REGEX];
  for (const regex of patterns) {
    const result = regex.test(text);
    regex.lastIndex = 0;
    if (result) return true;
  }
  return false;
}
