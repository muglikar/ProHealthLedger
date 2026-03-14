import { readDataFile } from "@/lib/github";

export async function GET() {
  const { data } = await readDataFile("data/profiles/_index.json");
  return Response.json(data);
}
