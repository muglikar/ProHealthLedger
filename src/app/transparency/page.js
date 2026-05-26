import { redirect } from "next/navigation";

/**
 * /transparency now redirects to the unified /profiles (Votes) page.
 * This preserves bookmarks and external links.
 */
export default function TransparencyPage() {
  redirect("/profiles");
}
