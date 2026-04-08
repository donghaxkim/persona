import { NextResponse } from "next/server";
import { createServerSupabase } from "./server";

export async function requireAuth() {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { user, error: null, supabase };
}
