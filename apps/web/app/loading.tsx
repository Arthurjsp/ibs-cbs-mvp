export default function Loading() {
  return (
    <div className="space-y-4 py-2" aria-live="polite" aria-busy="true">
      <p className="text-sm text-muted-foreground">Carregando dados da página...</p>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-24 animate-pulse rounded-md bg-muted" />
        <div className="h-24 animate-pulse rounded-md bg-muted" />
        <div className="h-24 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-56 animate-pulse rounded-md bg-muted" />
      <div className="h-56 animate-pulse rounded-md bg-muted" />
    </div>
  );
}
