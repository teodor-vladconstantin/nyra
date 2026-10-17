import Link from "next/link";

export function Brand({ orgName, href = "/admin" }: { orgName?: string; href?: string }) {
  return (
    <Link href={href} className="flex min-w-0 items-center gap-2.5 rounded-md">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="" width={32} height={32} className="size-8 shrink-0" />
      <span className="min-w-0 leading-tight">
        <span className="block text-lg font-bold tracking-[-0.04em]">Nyra</span>
        <span className="block text-caption font-medium text-muted-foreground">By Joben</span>
        {orgName && <span className="block truncate text-caption text-muted-foreground">{orgName}</span>}
      </span>
    </Link>
  );
}
