export function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-medium text-muted-foreground">
          Select an influencer
        </p>
        <p className="mt-1 text-sm text-muted-foreground/70">
          or create a new one to get started
        </p>
      </div>
    </div>
  );
}
