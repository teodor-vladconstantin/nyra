// Ilustrație statică a listei de candidați (nu sunt date reale). Construită din HTML ca să urmeze tema.
const ROWS = [
  { name: "Ana P.", role: "Frontend Developer", skills: ["React", "TypeScript", "SQL"], status: "Interviu", tone: "text-status-interview bg-status-interview/15" },
  { name: "Mihai D.", role: "Data Analyst", skills: ["SQL", "Python"], status: "Selectat", tone: "text-status-shortlisted bg-status-shortlisted/15" },
  { name: "Elena S.", role: "Project Manager", skills: ["Agile", "Jira"], status: "Nou", tone: "text-status-new bg-status-new/15" },
];

export function Preview() {
  return (
    <figure aria-label="Ilustrație: lista de candidați din Nyra" className="overflow-hidden rounded-xl border border-border bg-card shadow-pop">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="size-2.5 rounded-full bg-muted-foreground/30" aria-hidden />
        <span className="size-2.5 rounded-full bg-muted-foreground/30" aria-hidden />
        <span className="size-2.5 rounded-full bg-primary" aria-hidden />
        <span className="ml-3 text-caption font-medium text-muted-foreground">Candidați</span>
        <span className="ml-auto rounded-md border border-border px-2 py-1 text-caption text-muted-foreground">react sql</span>
      </div>
      <ul className="divide-y divide-border">
        {ROWS.map((r) => (
          <li key={r.name} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
            <span className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-semibold">{r.name[0]}</span>
            <span className="min-w-[8rem] flex-1 leading-tight">
              <span className="block text-sm font-semibold">{r.name}</span>
              <span className="block text-caption text-muted-foreground">{r.role}</span>
            </span>
            <span className="hidden gap-1.5 sm:flex">
              {r.skills.map((s) => <span key={s} className="rounded-md bg-secondary px-2 py-0.5 text-caption text-secondary-foreground">{s}</span>)}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-caption font-medium ${r.tone}`}>{r.status}</span>
          </li>
        ))}
      </ul>
      <figcaption className="border-t border-border px-4 py-2 text-caption text-muted-foreground">Ilustrație, nu date reale.</figcaption>
    </figure>
  );
}
