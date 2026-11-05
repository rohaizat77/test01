import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";

// The SDK reads ANTHROPIC_API_KEY from the environment; we never touch the key directly.
export const anthropic = config.hasAiKey ? new Anthropic({ timeout: 60_000, maxRetries: 2 }) : null;

// Server-side refusal fallback: if Claude declines, Anthropic re-runs the request on a suitable model.
export const FALLBACK = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default" as const,
};

export class AiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function requireAi(): Anthropic {
  if (!anthropic) throw new AiError(503, "AI features are not configured on this server yet.");
  return anthropic;
}

// Translate SDK errors into friendly, user-facing messages. Most specific first.
export function toAiError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof Anthropic.APIConnectionTimeoutError) return new AiError(504, "The AI took too long to respond. Please try again.");
  if (err instanceof Anthropic.APIConnectionError) return new AiError(502, "We couldn't reach the AI service. Check back in a moment.");
  if (err instanceof Anthropic.RateLimitError) return new AiError(429, "The AI is busy right now. Please wait a few seconds and try again.");
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return new AiError(503, "AI features are temporarily unavailable.");
  }
  if (err instanceof Anthropic.BadRequestError) return new AiError(422, "The AI couldn't process that input. Try a clearer photo or different wording.");
  if (err instanceof Anthropic.InternalServerError) return new AiError(503, "The AI service is having a moment. Please try again shortly.");
  if (err instanceof Anthropic.APIError) return new AiError(502, "The AI service returned an error. Please try again.");
  return new AiError(500, "Something went wrong while talking to the AI.");
}
