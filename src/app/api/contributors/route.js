import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const filePath = path.join(process.cwd(), "data", "users", "_index.json");
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const users = JSON.parse(raw);
    return NextResponse.json(users);
  } catch {
    return NextResponse.json([]);
  }
}
