export const dynamic = "force-dynamic";

export async function GET() {
  const query = "site:linkedin.com/in/iantarakey";
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html",
      },
    });

    const html = await res.text();
    
    // Find where iantarakey is mentioned and get surrounding 200 chars
    const index = html.toLowerCase().indexOf("iantarakey");
    const snippet = index !== -1 ? html.slice(Math.max(0, index - 200), index + 400) : "not found";

    // Let's also look for a href="https://...linkedin.com/in/
    const linkMatches = [];
    const linkRegex = /href="https?:\/\/[a-z]{2,3}\.linkedin\.com\/in\/[^"]+"/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      linkMatches.push(match[0]);
    }

    // Let's print any h2 tags in the HTML
    const h2Matches = [];
    const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
    while ((match = h2Regex.exec(html)) !== null) {
      h2Matches.push(match[1].replace(/<[^>]*>/g, "").trim());
    }

    // Let's look for images containing licdn
    const imgMatches = [];
    const imgRegex = /src="([^"]*media\.licdn\.com[^"]*)"/gi;
    while ((match = imgRegex.exec(html)) !== null) {
      imgMatches.push(match[1]);
    }

    return Response.json({
      snippet,
      linkMatches,
      h2Matches,
      imgMatches,
    });
  } catch (err) {
    return Response.json({ error: err.message });
  }
}
