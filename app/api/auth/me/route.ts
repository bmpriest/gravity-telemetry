import { getSessionUser } from "@/lib/session";
import { handle } from "@/lib/api";

export async function GET() {
  return handle(async () => {
    const user = await getSessionUser();
    return { user };
  });
}
