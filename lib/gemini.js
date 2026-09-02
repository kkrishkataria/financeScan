import { GoogleGenerativeAI } from "@google/generative-ai";

// Stable aliases track a supported model and avoid retired version-specific names.
const DEFAULT_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-pro-latest",
].filter(Boolean);

function getErrorMessage(error) {
  return error?.message || String(error);
}

function isModelNotFoundError(error) {
  const message = getErrorMessage(error);
  return (
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("not supported")
  );
}

function isRetryableError(error) {
  const message = getErrorMessage(error);
  return (
    isModelNotFoundError(error) ||
    message.includes("503") ||
    message.includes("429") ||
    message.includes("high demand") ||
    message.includes("overloaded") ||
    message.includes("UNAVAILABLE") ||
    message.includes("RESOURCE_EXHAUSTED")
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

export async function generateGeminiContent(content, options = {}) {
  const { maxRetries = 2, generationConfig = {} } = options;
  const genAI = getGeminiClient();
  let lastError;

  for (const modelName of DEFAULT_MODELS) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 256,
            ...generationConfig,
          },
        });

        const result = await model.generateContent(content);
        return result.response;
      } catch (error) {
        lastError = error;

        if (isRetryableError(error) && attempt < maxRetries) {
          await sleep(400 * Math.pow(2, attempt));
          continue;
        }

        if (isRetryableError(error)) {
          break;
        }

        throw error;
      }
    }
  }

  const message = getErrorMessage(lastError);
  if (message.includes("503") || message.includes("high demand")) {
    throw new Error(
      "AI is busy right now. Please wait a moment and try again."
    );
  }

  throw new Error(
    message || "No compatible Gemini model is available. Set GEMINI_MODEL in .env."
  );
}
