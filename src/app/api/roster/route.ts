import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/middleware";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user, supabase } = auth;

  const { data, error } = await supabase
    .from("roster_order")
    .select("*")
    .eq("user_id", user!.id)
    .single();

  if (error && error.code === "PGRST116") {
    return NextResponse.json({ order_data: [], folders: [], updated_at: null });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user, supabase } = auth;

  const body = await request.json();
  const { order_data, folders, last_updated_at } = body;

  const { data: existing } = await supabase
    .from("roster_order")
    .select("updated_at")
    .eq("user_id", user!.id)
    .single();

  if (existing && last_updated_at && existing.updated_at !== last_updated_at) {
    return NextResponse.json(
      { error: "Conflict — roster was updated in another tab", current: existing },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("roster_order")
    .upsert({
      user_id: user!.id,
      order_data,
      folders,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
