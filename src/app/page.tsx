import { StoreProvider } from "@/providers/store-provider";
import { AppShell } from "@/components/layout/app-shell";

export default function Home() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}
