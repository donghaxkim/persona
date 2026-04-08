import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/middleware";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase } = auth;
  const { id } = await params;

  const { data: ref } = await supabase
    .from("reference_images")
    .select("storage_path, thumbnail_path")
    .eq("id", id)
    .single();

  if (!ref) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase
    .from("reference_images")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const paths = [ref.storage_path, ref.thumbnail_path]
    .filter(Boolean)
    .map((p) => p.replace("references/", ""));

  if (paths.length > 0) {
    supabase.storage.from("references").remove(paths);
  }

  return NextResponse.json({ success: true });
}
