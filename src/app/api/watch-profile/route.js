import { addWatcher, removeWatcher } from "@/lib/push-notify";

export async function POST(req) {
  try {
    const { subscription, profileSlug } = await req.json();
    if (!subscription || !profileSlug) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    await addWatcher(profileSlug, subscription);
    return Response.json({ success: true });
  } catch (err) {
    console.error("Watch profile subscription error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { endpoint, profileSlug } = await req.json();
    if (!endpoint || !profileSlug) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    await removeWatcher(profileSlug, endpoint);
    return Response.json({ success: true });
  } catch (err) {
    console.error("Watch profile unsubscribe error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
