"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors,
  type Announcements, type DragEndEvent, type DragStartEvent, type KeyboardCoordinateGetter, type ScreenReaderInstructions,
} from "@dnd-kit/core";
import { Copy, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ParsingBadge, type ParsingStatus } from "@/components/badges";
import { SENIORITY_LABELS } from "@/lib/experience";
import { STATUSES, STATUS_LABELS, STATUS_TONES, type CandidateRow, type Status } from "@/lib/candidates";
import { setStatus } from "@/app/admin/candidati/actions";
import { TagChips } from "./tag-chips";

const label = (r?: CandidateRow) => r?.name ?? r?.file_name ?? "Candidat fără nume";
const isStatus = (v: unknown): v is Status => typeof v === "string" && v in STATUS_LABELS;

const instructions: ScreenReaderInstructions = {
  draggable:
    "Pentru a muta candidatul apasă Space sau Enter. Apoi alege coloana cu săgețile stânga și dreapta și apasă Space pentru a-l plasa. Escape anulează mutarea.",
};

// Tastatura sare de la o coloană la alta (implicit ar muta cardul din 25 în 25 de pixeli).
const columnKeyboard: KeyboardCoordinateGetter = (event, { context: { droppableRects, droppableContainers, collisionRect }, currentCoordinates }) => {
  const dir = event.code === "ArrowRight" ? 1 : event.code === "ArrowLeft" ? -1 : 0;
  if (!dir || !collisionRect) return;
  event.preventDefault();
  const cols = droppableContainers.getEnabled()
    .map((c) => ({ id: c.id, rect: droppableRects.get(c.id) }))
    .filter((c): c is { id: Status; rect: NonNullable<typeof c.rect> } => !!c.rect && isStatus(c.id))
    .sort((a, b) => STATUSES.indexOf(a.id) - STATUSES.indexOf(b.id));
  const cx = collisionRect.left + collisionRect.width / 2;
  let cur = cols.findIndex((c) => cx >= c.rect.left && cx <= c.rect.left + c.rect.width);
  if (cur < 0) cur = 0;
  const target = cols[Math.min(cols.length - 1, Math.max(0, cur + dir))];
  return target ? { x: target.rect.left + 8, y: currentCoordinates.y } : undefined;
};

function CardBody({ r }: { r: CandidateRow }) {
  const years = Number(r.years_experience);
  return (
    <>
      <Link href={`/admin/candidati/${r.id}`} className="block truncate text-sm font-medium hover:underline">{label(r)}</Link>
      {r.last_role ? (
        <p className="truncate text-xs text-muted-foreground">{r.last_role}{r.last_company ? ` · ${r.last_company}` : ""}</p>
      ) : (
        <ParsingBadge status={r.parsing_status as ParsingStatus} />
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {years > 0 && <span className="tabular-nums">{years.toLocaleString("ro-RO")} ani</span>}
        {r.seniority && <span>{years > 0 && "· "}{SENIORITY_LABELS[r.seniority as keyof typeof SENIORITY_LABELS]}</span>}
        {r.duplicate_of && (
          <span className="inline-flex items-center gap-1 text-warning" title="Posibil duplicat"><Copy className="size-3" aria-hidden /> Duplicat</span>
        )}
      </div>
      {r.tags?.length > 0 && <div className="mt-1.5"><TagChips tags={r.tags} max={2} /></div>}
    </>
  );
}

function Card({ r, canDrag }: { r: CandidateRow; canDrag: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: r.id, disabled: !canDrag });
  return (
    <li ref={setNodeRef} className={cn("flex items-start gap-1 rounded-md border bg-card p-2 shadow-sm", isDragging && "opacity-40")}>
      {canDrag && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-roledescription="element mutabil"
          aria-label={`Mută ${label(r)}`}
          className="-ml-1 mt-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      )}
      <div className="min-w-0 flex-1"><CardBody r={r} /></div>
    </li>
  );
}

function Column({ status, items, canDrag }: { status: Status; items: CandidateRow[]; canDrag: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section aria-labelledby={`col-${status}`} className={cn("flex w-72 shrink-0 flex-col rounded-lg border bg-muted/40 transition-colors", isOver && "border-brand bg-brand/5")}>
      <header className="flex items-center justify-between gap-2 p-3">
        <h2 id={`col-${status}`} className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_TONES[status])}>{STATUS_LABELS[status]}</h2>
        <span className="text-xs tabular-nums text-muted-foreground" aria-label={`${items.length} candidați`}>{items.length}</span>
      </header>
      <ul ref={setNodeRef} className="flex max-h-[calc(100vh-20rem)] min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {items.map((r) => <Card key={r.id} r={r} canDrag={canDrag} />)}
        {items.length === 0 && (
          <li className="grid flex-1 place-items-center rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            {canDrag ? "Niciun candidat. Trage un card aici." : "Niciun candidat"}
          </li>
        )}
      </ul>
    </section>
  );
}

export function Kanban({ rows, total, isAdmin }: { rows: CandidateRow[]; total: number; isAdmin: boolean }) {
  const [items, setItems] = useState(rows);
  const [active, setActive] = useState<CandidateRow | null>(null);
  const inflight = useRef(0);

  // Datele noi de pe server (refresh, filtre) înlocuiesc starea locală, dar nu în mijlocul unei mutări optimiste.
  useEffect(() => { if (!inflight.current) setItems(rows); }, [rows]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnKeyboard }),
  );
  const byId = (id: unknown) => items.find((r) => r.id === id);

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Ai ridicat ${label(byId(active.id))}.`,
    onDragOver: ({ active, over }) => over && isStatus(over.id) ? `${label(byId(active.id))} este deasupra coloanei ${STATUS_LABELS[over.id]}.` : undefined,
    onDragEnd: ({ active, over }) => over && isStatus(over.id) ? `${label(byId(active.id))} a fost mutat în ${STATUS_LABELS[over.id]}.` : `${label(byId(active.id))} a rămas pe loc.`,
    onDragCancel: ({ active }) => `Mutarea a fost anulată; ${label(byId(active.id))} a rămas pe loc.`,
  };

  function onDragEnd({ active: a, over }: DragEndEvent) {
    setActive(null);
    const row = byId(a.id);
    if (!row || !over || !isStatus(over.id) || over.id === row.status) return;
    const to = over.id, from = row.status;
    setItems((xs) => xs.map((r) => (r.id === row.id ? { ...r, status: to } : r)));
    inflight.current++;
    setStatus(row.id, to)
      .then(() => toast.success(`${label(row)}: ${STATUS_LABELS[to]}`, { id: `status-${row.id}` }))
      .catch(() => {
        // Rollback doar dacă între timp cardul nu a mai fost mutat în altă parte.
        setItems((xs) => xs.map((r) => (r.id === row.id && r.status === to ? { ...r, status: from } : r)));
        toast.error(`${label(row)} nu a putut fi mutat în ${STATUS_LABELS[to]}`);
      })
      .finally(() => { inflight.current--; });
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        accessibility={{ announcements, screenReaderInstructions: instructions }}
        onDragStart={({ active: a }: DragStartEvent) => setActive(byId(a.id) ?? null)}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActive(null)}
      >
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-3" role="group" aria-label="Pipeline de recrutare">
          {STATUSES.map((s) => <Column key={s} status={s} items={items.filter((r) => r.status === s)} canDrag={isAdmin} />)}
        </div>
        <DragOverlay>
          {active && (
            <div className="w-72 cursor-grabbing rounded-md border border-brand bg-card p-2 shadow-lg"><CardBody r={active} /></div>
          )}
        </DragOverlay>
      </DndContext>
      {total > rows.length && (
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          Se afișează primii {rows.length} din {total} candidați. Restrânge filtrele pentru a vedea restul.
        </p>
      )}
      {!isAdmin && <p className="mt-2 text-xs text-muted-foreground">Vizualizare doar pentru citire: statusul îl schimbă adminii.</p>}
    </>
  );
}
