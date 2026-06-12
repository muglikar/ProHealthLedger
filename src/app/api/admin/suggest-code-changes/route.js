import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isRepoMaintainerUserId } from "@/lib/repo-owner-session";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  const isAdmin =
    session?.userId &&
    (Boolean(session.siteAdmin) || isRepoMaintainerUserId(session.userId));

  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "Prompt is required." }, { status: 400 });
    }

    const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
    const openAiKey = (process.env.OPENAI_API_KEY || "").trim();

    if (!geminiKey && !openAiKey) {
      return Response.json({
        response: "⚠️ **No LLM API keys configured.**\n\nPlease set either `GEMINI_API_KEY` or `OPENAI_API_KEY` in your `.env` file to enable AI code change suggestions directly from this panel."
      });
    }

    let responseText = "";

    if (geminiKey) {
      // Call Gemini 1.5 Flash
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are Antigravity, the AI pair programmer for ProHealthLedger (PHL). The admin of the site is asking for code changes or technical suggestions. Understood that the codebase is built with Next.js App Router, React, and CSS.\n\nRequest:\n${prompt}`
            }]
          }]
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API error: ${res.status} - ${err}`);
      }

      const data = await res.json();
      responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
    } else {
      // Call OpenAI Chat Completions
      const url = "https://api.openai.com/v1/chat/completions";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are Antigravity, the AI pair programmer for ProHealthLedger (PHL). The admin of the site is asking for code changes or technical suggestions. Understood that the codebase is built with Next.js App Router, React, and CSS."
            },
            {
              role: "user",
              content: prompt
            }
          ]
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI API error: ${res.status} - ${err}`);
      }

      const data = await res.json();
      responseText = data?.choices?.[0]?.message?.content || "No response generated.";
    }

    return Response.json({ response: responseText });
  } catch (error) {
    console.error("[suggest-code-changes] error:", error);
    return Response.json({ error: error.message || "Failed to generate suggestions" }, { status: 500 });
  }
}
