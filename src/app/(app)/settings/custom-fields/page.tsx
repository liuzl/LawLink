import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listCustomFieldDefs } from "@/server/custom-fields/actions";
import { CustomFieldsView } from "./_components/custom-fields-view";

export default async function CustomFieldsPage() {
  const session = await getSession();
  if (session?.user.role !== "ADMIN") redirect("/settings/profile");

  const matterFields = await listCustomFieldDefs("MATTER");
  return <CustomFieldsView matterFields={matterFields} />;
}
