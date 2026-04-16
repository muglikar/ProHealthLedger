import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Professional Health Ledger — Know Who You're Working With";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  const logoData = await readFile(join(process.cwd(), "public", "logo.png"));
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          padding: "60px",
          gap: "24px",
        }}
      >
        {/* Logo */}
        <img
          src={logoSrc}
          width={180}
          height={180}
          style={{ borderRadius: "24px" }}
        />

        {/* Site name */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <h1
            style={{
              fontSize: "52px",
              fontWeight: 700,
              color: "#f8fafc",
              margin: 0,
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            Professional Health Ledger
          </h1>

          <p
            style={{
              fontSize: "26px",
              fontWeight: 400,
              color: "#d4a053",
              margin: 0,
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            Know who you&apos;re working with — before you commit.
          </p>

          <p
            style={{
              fontSize: "18px",
              fontWeight: 400,
              color: "#94a3b8",
              margin: 0,
              textAlign: "center",
              lineHeight: 1.5,
              maxWidth: "800px",
            }}
          >
            A free, public, and transparent directory of professional experiences.
            Look up anyone, read honest reviews, and share your own truth.
          </p>
        </div>
      </div>
    ),
    { ...size }
  );
}
