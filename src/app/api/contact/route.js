import { readDataFile, writeDataFile } from "@/lib/github";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, mobile, organization, country, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const contactData = {
      name,
      email,
      mobile: mobile || "N/A",
      organization: organization || "Individual",
      country: country || "Unknown",
      message,
      timestamp: new Date().toISOString()
    };

    const { data: submissions, sha } = await readDataFile("data/contact_submissions/_index.json");
    submissions.push(contactData);

    await writeDataFile(
      "data/contact_submissions/_index.json",
      submissions,
      sha,
      `New contact form submission from ${name}`
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to store contact submission:", err);
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}
