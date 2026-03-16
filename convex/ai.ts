"use node";

/**
 * Convex AI Actions
 *
 * Server-side AI calls to Gemini (OpenAI-compatible API).
 * Handles text-to-diagram (Mermaid generation) and diagram-to-code (HTML generation).
 * API keys stay server-side — frontend never sees them.
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// =========================================================================
// HELPERS
// =========================================================================

function getAIConfig() {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "gemini-2.5-flash";

  if (!baseUrl || !apiKey) {
    throw new Error("AI not configured: AI_BASE_URL and AI_API_KEY must be set in convex/.env");
  }

  return { baseUrl, apiKey, model };
}

async function callChatCompletion(
  config: { baseUrl: string; apiKey: string; model: string },
  messages: { role: string; content: string | object[] }[],
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429) {
      throw new Error("AI rate limit reached. Please try again in a moment.");
    }
    throw new Error(`AI request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI returned an empty response");
  }

  return content;
}

async function checkUserLimit(ctx: any): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized: authentication required");
  }
  const userId = identity.subject;

  // Check limits inline (actions can't call queries, so we check directly)
  // For now, we trust the frontend limit check and just track usage
  // The trackUsageInternal mutation handles the actual counting
  return userId;
}

// =========================================================================
// ACTIONS
// =========================================================================

/**
 * Text-to-Diagram: Takes a natural language prompt, returns Mermaid syntax.
 */
export const textToDiagram = action({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, args): Promise<{ generatedResponse: string }> => {
    const userId = await checkUserLimit(ctx);
    const config = getAIConfig();

    const systemPrompt = `You are a diagram generator. Given a natural language description, generate a valid Mermaid diagram definition.

Rules:
- Output ONLY the Mermaid definition, no markdown fences, no explanation
- Use flowchart (graph TD/LR), sequence, class, state, er, gantt, or pie chart syntax as appropriate
- Keep node labels concise
- Use descriptive edge labels where helpful
- Ensure the syntax is valid Mermaid that will render without errors
- For flowcharts, prefer "graph TD" (top-down) unless the user specifies direction
- Use proper Mermaid quoting for labels with special characters: use double quotes around labels containing parentheses, brackets, or special chars`;

    const content = await callChatCompletion(config, [
      { role: "system", content: systemPrompt },
      { role: "user", content: args.prompt },
    ]);

    // Strip markdown fences if the model wraps them anyway
    const cleaned = content
      .replace(/^```(?:mermaid)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    // Track usage
    await ctx.runMutation(internal.aiUsage.trackUsageInternal, {
      userId,
      feature: "text-to-diagram",
    });

    return { generatedResponse: cleaned };
  },
});

/**
 * Diagram-to-Code: Takes a wireframe screenshot + text, returns HTML/CSS.
 */
export const diagramToCode = action({
  args: {
    image: v.string(), // Base64 data URL (JPEG)
    texts: v.array(v.string()), // Extracted text from frame elements
    theme: v.string(), // "light" or "dark"
  },
  handler: async (ctx, args): Promise<{ html: string }> => {
    const userId = await checkUserLimit(ctx);
    const config = getAIConfig();

    const systemPrompt = `You are a frontend code generator. Given a wireframe screenshot and extracted text, generate a complete, self-contained HTML page with inline CSS that recreates the wireframe as a functional UI.

Rules:
- Output ONLY the HTML code, starting with <!DOCTYPE html> or <html>
- No markdown fences, no explanation, no comments outside the code
- Use modern CSS (flexbox, grid) for layout
- Make it responsive
- Use a clean, professional design
- Theme: ${args.theme === "dark" ? "dark background (#1e1e1e) with light text" : "light background (#ffffff) with dark text"}
- Include all text content from the wireframe
- Add reasonable placeholder content where the wireframe shows empty areas
- Make buttons and interactive elements look clickable (hover states)`;

    const textContext =
      args.texts.length > 0
        ? `\n\nText content extracted from the wireframe:\n${args.texts.join("\n")}`
        : "";

    const content = await callChatCompletion(config, [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: args.image },
          },
          {
            type: "text",
            text: `Convert this wireframe into a complete HTML page with inline CSS.${textContext}`,
          },
        ],
      },
    ]);

    // Strip markdown fences if present
    const cleaned = content
      .replace(/^```(?:html)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    // Track usage
    await ctx.runMutation(internal.aiUsage.trackUsageInternal, {
      userId,
      feature: "diagram-to-code",
    });

    return { html: cleaned };
  },
});
