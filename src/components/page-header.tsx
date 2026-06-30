export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="panel">
      <p className="text-sm text-zinc-400">{subtitle}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">{title}</h1>
    </header>
  );
}
