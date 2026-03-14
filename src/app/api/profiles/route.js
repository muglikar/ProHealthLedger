import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const filePath = path.join(process.cwd(), "data", "profiles", "_index.json");
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const profiles = JSON.parse(raw);
    return NextResponse.json(profiles);
  } catch {
    return NextResponse.json([]);
  }
}
