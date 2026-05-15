import { readDataFile, writeDataFile } from "@/lib/github";
import crypto from "crypto";

export async function POST(req) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature || !secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.text();
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  if (signature !== expectedSignature) {
    return new Response("Invalid signature", { status: 400 });
  }

  const payload = JSON.parse(body);
  const event = payload.event;

  // Mapping button IDs to Tiers for reliability
  const TIER_MAP = {
    "pl_SpXARLspaT6MIJ": "Supporter",
    // Add other IDs here as they become available
  };

  if (event === "payment.captured") {
    const payment = payload.payload.payment.entity;
    const buttonId = payment.payment_button_id;
    
    // Extract metadata from notes or entity
    const sponsorData = {
      tier: TIER_MAP[buttonId] || payment.notes?.tier || payment.description || "Unknown",
      name: payment.notes?.name || payment.notes?.full_name || payment.customer_details?.name || "Anonymous",
      email: payment.email || payment.notes?.email || "N/A",
      org: payment.notes?.org || payment.notes?.organization || "Individual",
      country: payment.notes?.country || (payment.currency === "INR" ? "India" : "International"),
      amount: payment.amount / 100, // Razorpay amounts are in paise
      currency: payment.currency,
      timestamp: new Date(payment.created_at * 1000).toISOString(),
      payment_method: payment.method,
      razorpay_payment_id: payment.id,
      razorpay_order_id: payment.order_id
    };

    try {
      const { data: sponsors, sha } = await readDataFile("data/sponsors/_index.json");
      sponsors.push(sponsorData);
      
      await writeDataFile(
        "data/sponsors/_index.json",
        sponsors,
        sha,
        `New sponsorship from ${sponsorData.name} (${sponsorData.tier})`
      );

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("Failed to store sponsor data:", err);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  return new Response("Event ignored", { status: 200 });
}
