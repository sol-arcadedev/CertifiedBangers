import { createTitle } from "@/lib/actions/titles";
import { TitleForm } from "@/components/admin/title-form";

export default function NewTitlePage() {
  return (
    <div className="mx-auto w-full max-w-xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold text-black dark:text-zinc-50">New title</h1>
      <TitleForm action={createTitle} submitLabel="Create title" />
    </div>
  );
}
