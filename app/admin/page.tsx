import { getAdminPassword, isAdminAuthenticated } from "@/app/api/admin/auth";
import { AdminClient } from "./AdminClient";

export default async function AdminPage() {
  const hasAdminPassword = Boolean(getAdminPassword());
  const authenticated = hasAdminPassword ? await isAdminAuthenticated() : false;

  return (
    <AdminClient
      initialAuthenticated={authenticated}
      configError={hasAdminPassword ? null : "Missing ADMIN_PASSWORD"}
    />
  );
}
