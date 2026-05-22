import { listAllDocuments } from "@/server/documents/actions";
import { DocumentsView } from "./_components/documents-view";
import type { DocumentCategory } from "@prisma/client";

type Props = {
  searchParams: { search?: string; category?: DocumentCategory };
};

export default async function DocumentsPage({ searchParams }: Props) {
  const items = await listAllDocuments({
    search: searchParams.search,
    category: searchParams.category
  });
  return (
    <DocumentsView
      items={items}
      initialFilters={{
        search: searchParams.search ?? "",
        category: searchParams.category ?? "ALL"
      }}
    />
  );
}
