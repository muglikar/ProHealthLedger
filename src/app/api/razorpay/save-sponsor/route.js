import { readDataFile, writeDataFile } from "@/lib/github";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { tier, name, email, mobile, org, country, amount, currency, razorpay_payment_id, razorpay_order_id } = body;

    if (!razorpay_payment_id || !name || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sponsorData = {
      tier: tier || "Unknown",
      name: name || "Anonymous",
      email: email || "N/A",
      mobile: mobile || "N/A",
      org: org || "Individual",
      country: country || "Unknown",
      amount: amount || 0,
      currency: currency || "INR",
      timestamp: new Date().toISOString(),
      razorpay_payment_id,
      razorpay_order_id: razorpay_order_id || ""
    };

    const { data: sponsors, sha } = await readDataFile("data/sponsors/_index.json");
    sponsors.push(sponsorData);

    await writeDataFile(
      "data/sponsors/_index.json",
      sponsors,
      sha,
      `New sponsorship from ${sponsorData.name} (${sponsorData.tier})`
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to store sponsor data:", err);
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}
