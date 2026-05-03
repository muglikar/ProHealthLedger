import { readFile } from "fs/promises";
import path from "path";

/**
 * Vendored WOFF (v1) at `public/fonts/monda-400.woff` + `monda-700.woff`.
 * Satori rejects WOFF2; variable TTF also fails — static latin WOFF works.
 */
let resolvedFonts = null;

function fontEntriesFromBuffers(buf400, buf700) {
  const d400 =
    buf400 instanceof ArrayBuffer
      ? buf400
      : buf400.buffer.slice(buf400.byteOffset, buf400.byteOffset + buf400.byteLength);
  const d700 =
    buf700 instanceof ArrayBuffer
      ? buf700
      : buf700.buffer.slice(buf700.byteOffset, buf700.byteOffset + buf700.byteLength);
  return [
    { name: "Monda", data: d400, style: "normal", weight: 400 },
    { name: "Monda", data: d700, style: "normal", weight: 700 },
  ];
}

async function readLocalPair() {
  const base = path.join(process.cwd(), "public", "fonts");
  const [buf400, buf700] = await Promise.all([
    readFile(path.join(base, "monda-400.woff")),
    readFile(path.join(base, "monda-700.woff")),
  ]);
  return fontEntriesFromBuffers(buf400, buf700);
}

async function fetchPairFromSite() {
  const origin = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://prohealthledger.org"
  ).replace(/\/+$/, "");
  const [res400, res700] = await Promise.all([
    fetch(`${origin}/fonts/monda-400.woff`, { signal: AbortSignal.timeout(8000) }),
    fetch(`${origin}/fonts/monda-700.woff`, { signal: AbortSignal.timeout(8000) }),
  ]);
  if (!res400.ok || !res700.ok) {
    throw new Error(`monda woff HTTP ${res400.status}/${res700.status}`);
  }
  const [b400, b700] = await Promise.all([
    res400.arrayBuffer(),
    res700.arrayBuffer(),
  ]);
  return fontEntriesFromBuffers(Buffer.from(b400), Buffer.from(b700));
}

export async function getMondaFontsForOg() {
  if (resolvedFonts) return resolvedFonts;

  try {
    resolvedFonts = await readLocalPair();
    return resolvedFonts;
  } catch {
    /* Edge: no fs */
  }

  try {
    resolvedFonts = await fetchPairFromSite();
    return resolvedFonts;
  } catch (e) {
    console.error("getMondaFontsForOg: fallback sans-serif", e?.message || e);
    resolvedFonts = [];
    return resolvedFonts;
  }
}
