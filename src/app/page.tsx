import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { StoreProvider } from "@/providers/store-provider";
import { AppShell } from "@/components/layout/app-shell";

export default async function Home() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}
