
async function test() {
  const slug = "shailendra-kavathekar-b5185346";
  const url = `https://www.linkedin.com/in/${encodeURIComponent(slug)}/`;
  console.log(`Testing URL: ${url}`);
  
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html",
      },
    });
    
    console.log(`Status: ${res.status}`);
    console.log(`Location: ${res.headers.get("location")}`);
    
    const text = await res.text();
    console.log(`Body length: ${text.length}`);
    console.log(`Body preview: ${text.substring(0, 500)}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

test();
