import { pushAuthDiagnostic } from "./authDiagnostics";
import { clearActiveCustomerSession, getActiveCustomerSession } from "./customerSessionStore";
import { clearActiveStaffSession, getActiveStaffUser } from "./staffUsersStore";

export function clearAllAuthSessions(reason = "manual-logout") {
  const staffBeforeClear = getActiveStaffUser();
  const customerBeforeClear = getActiveCustomerSession();

  clearActiveCustomerSession({ reason });
  clearActiveStaffSession({ reason });

  pushAuthDiagnostic("all-sessions-cleared", {
    reason,
    clearedCustomerSession: Boolean(customerBeforeClear),
    clearedStaffSession: Boolean(staffBeforeClear),
    previousCustomerEmail: customerBeforeClear?.email || "",
    previousStaffUserId: staffBeforeClear?.id || "",
    previousStaffRole: staffBeforeClear?.role || "",
  });
}
