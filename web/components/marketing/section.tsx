import { cn } from "@/lib/utils";

export const wrap = "mx-auto w-full max-w-6xl px-4 sm:px-6";

export function Section({ id, eyebrow, title, intro, className, children }: {
  id?: string; eyebrow?: string; title: React.ReactNode; intro?: React.ReactNode; className?: string; children?: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("scroll-mt-20 py-16 sm:py-24", className)}>
      <div className={wrap}>
        <div className="max-w-2xl">
          {eyebrow && <p className="mb-3 text-caption font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>}
          <h2 className="text-3xl font-bold leading-tight tracking-[-0.03em] sm:text-4xl">{title}</h2>
          {intro && <p className="mt-4 text-base leading-relaxed text-muted-foreground">{intro}</p>}
        </div>
        {children && <div className="mt-10 sm:mt-12">{children}</div>}
      </div>
    </section>
  );
}
