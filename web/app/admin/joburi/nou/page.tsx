import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/org";
import { createJob } from "../actions";
import { JobForm } from "../job-form";

export const metadata = { title: "Job nou" };

export default async function NewJobPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Job nou" />
      <div className="max-w-3xl rounded-lg border bg-card p-5"><JobForm action={createJob} submit="Creează jobul" /></div>
    </>
  );
}
