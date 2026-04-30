// ============================================================
// Digital101 AI — Vercel Serverless Backend
// File: /api/generate.js
// Deploy this in your Vercel project root /api folder
// Your Anthropic API key stays SERVER-SIDE — never exposed
// ============================================================

export default async function handler(req, res) {
  // ── CORS Headers (allow your domain only in production) ──
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "https://digital101AI.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { prompt, userId, tool, planId } = req.body;

    if (!prompt || !userId || !tool) {
      return res.status(400).json({ error: "Missing required fields: prompt, userId, tool" });
    }

    // ── Plan usage limits ──
    const PLAN_LIMITS = { free: 3, starter: 25, pro: 100 };

    // ── Call Anthropic Claude API ──
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: `You are Digital101 AI — an expert digital product business coach for beginners. 
You help users create printables, planners, journals, checklists, eBooks, KDP books, and Canva-based 
digital products. Always be specific, encouraging, beginner-friendly, and actionable. 
Never guarantee income or sales. Always add a brief copyright reminder at the end.`,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Anthropic API error:", errorData);
      return res.status(500).json({ error: "AI generation failed. Please try again." });
    }

    const data = await response.json();
    const generatedText = data?.content?.[0]?.text || "No content generated.";

    console.log(`[Digital101 AI] User: ${userId} | Tool: ${tool} | Plan: ${planId}`);

    return res.status(200).json({
      success: true,
      content: generatedText,
      tool,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Internal server error. Please try again." });
  }
}
