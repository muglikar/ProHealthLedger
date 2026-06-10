export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "iantarakey").trim();
  const apiKey = (process.env.ZYTE_API_KEY || "").trim();

  if (!apiKey) {
    return Response.json({ error: "No ZYTE_API_KEY configured on this server." });
  }

  const url = `https://www.linkedin.com/in/${encodeURIComponent(slug)}`;
  
  try {
    const res = await fetch("https://api.zyte.com/v1/webpage", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(apiKey + ":"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url,
        browserHtml: true,
      }),
    });

    const status = res.status;
    const statusText = res.statusText;

    if (!res.ok) {
      const errorText = await res.text();
      return Response.json({ status, statusText, error: errorText });
    }

    const data = await res.json();
    const html = data.browserHtml || "";
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : null;

    // Check for login / redirect indications
    const isLogin = html.includes("login") || html.includes("signin") || html.includes("authwall");

    return Response.json({
      status,
      title,
      isLogin,
      htmlLength: html.length,
      htmlPreview: html.slice(0, 1000),
      htmlEndPreview: html.slice(-1000),
    });
  } catch (err) {
    return Response.json({ error: err.message });
  }
}
