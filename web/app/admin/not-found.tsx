import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/page-header";

export const metadata = { title: "Pagină negăsită" };

export default function AdminNotFound() {
  return (
    <EmptyState
      className="mt-8 border-solid"
      icon={<SearchX />}
      title="Pagina nu există"
      action={<Button asChild><Link href="/admin/candidati">Mergi la candidați</Link></Button>}
    >
      Link-ul poate fi greșit, iar candidatul sau pagina au fost șterse.
    </EmptyState>
  );
}
