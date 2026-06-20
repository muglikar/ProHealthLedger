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
      const fs = require("fs");
      const path = require("path");
      const dirPath = path.join(process.cwd(), "data");
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const promptFilePath = path.join(dirPath, "ai_prompt.json");
      fs.writeFileSync(
        promptFilePath,
        JSON.stringify(
          {
            prompt: prompt,
            status: "pending",
            response: null,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        )
      );

      // Poll for response for up to 10 seconds
      const startTime = Date.now();
      let responseText = "";
      while (Date.now() - startTime < 10000) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        try {
          if (fs.existsSync(promptFilePath)) {
            const fileData = JSON.parse(fs.readFileSync(promptFilePath, "utf8"));
            if (fileData.status === "completed" && fileData.response) {
              responseText = fileData.response;
              break;
            }
          }
        } catch (e) {
          // ignore read errors
        }
      }

      if (responseText) {
        return Response.json({ response: responseText });
      }

      return Response.json({
        response:
          "⏳ **No LLM API keys configured in `.env`. Prompt queued for Antigravity (the agent).**\n\nYour prompt has been written to `data/ai_prompt.json` in the workspace.\n\nPlease ask the agent in the chat terminal to process this prompt, or wait a moment if the agent is currently working on it, then try submitting again."
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
