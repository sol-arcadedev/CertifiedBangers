import { requireMainAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { createCategory, updateCategory, createSealType, updateSealType } from "@/lib/actions/config";
import { CategoryForm } from "@/components/admin/category-form";
import { SealTypeForm } from "@/components/admin/seal-type-form";

const LOCKED_SEAL_TYPE_NAMES = ["Certified Banger", "Hidden Gem"];

export default async function AdminConfigPage() {
  await requireMainAdmin();

  const [categories, sealTypes] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.sealType.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <h1 className="mb-2 text-xl font-semibold text-foreground">Categories & seal types</h1>
      <p className="mb-6 text-sm text-muted">
        Data-driven (Journal Entries 2, 14) — adding a 6th category or a new seal type is a data
        change, not a deploy.
      </p>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Categories</h2>
      <div className="flex flex-col gap-4">
        {categories.map((category) => (
          <CategoryForm
            key={category.id}
            action={updateCategory.bind(null, category.id)}
            defaults={{
              name: category.name,
              scaleMin: category.scaleMin,
              scaleMax: category.scaleMax,
              appliesToType: category.appliesToType,
            }}
            submitLabel="Save"
          />
        ))}
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted">Add category</h3>
          <CategoryForm action={createCategory} submitLabel="Create" />
        </div>
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold text-foreground">Seal types</h2>
      <div className="flex flex-col gap-4">
        {sealTypes.map((sealType) => (
          <SealTypeForm
            key={sealType.id}
            action={updateSealType.bind(null, sealType.id)}
            defaults={{ name: sealType.name, description: sealType.description, icon: sealType.icon }}
            submitLabel="Save"
            nameLocked={LOCKED_SEAL_TYPE_NAMES.includes(sealType.name)}
          />
        ))}
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted">Add seal type</h3>
          <SealTypeForm action={createSealType} submitLabel="Create" />
        </div>
      </div>
    </div>
  );
}
