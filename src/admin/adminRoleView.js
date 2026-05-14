import { getActiveStaffUser, getStoredStaffUsers } from "../lib/staffUsersStore";

function getDefaultOperationalViewer() {
  return (
    getStoredStaffUsers().find(
      (user) =>
        user?.status !== "Inactive" &&
        (user.role === "Owner" || user.role === "Manager")
    ) || null
  );
}

export function getAdminViewer(staffUser = getActiveStaffUser()) {
  return staffUser || getDefaultOperationalViewer();
}

export function isAdminWorkspaceView(staffUser = getActiveStaffUser()) {
  const role = getAdminViewer(staffUser)?.role;
  return role === "Owner" || role === "Manager";
}

export function isOwnerView(staffUser = getActiveStaffUser()) {
  return getAdminViewer(staffUser)?.role === "Owner";
}

export function isStaffWorkspaceView(staffUser = getActiveStaffUser()) {
  const viewer = getAdminViewer(staffUser);
  return Boolean(viewer) && viewer.role === "Staff";
}

export function canManageArchivedQuotes(staffUser = getActiveStaffUser()) {
  return isAdminWorkspaceView(staffUser);
}

export function matchesAssignedStaff(order, staffUser = getActiveStaffUser()) {
  const viewer = getAdminViewer(staffUser);
  if (!viewer) return false;

  if (viewer.id && order.assigned_to_staff_id) {
    return order.assigned_to_staff_id === viewer.id;
  }

  return Boolean(
    viewer.name &&
      order.assigned_to_staff_name &&
      order.assigned_to_staff_name === viewer.name
  );
}

export function getAssignedOrdersForStaff(orders = [], staffUser = getActiveStaffUser()) {
  return orders.filter((order) => matchesAssignedStaff(order, staffUser));
}

export function getOperationalOrdersForStaff(orders = []) {
  return orders.filter((order) => order.operational_visible !== false);
}

export function canAccessOwnerWorkspace(pathname, staffUser = getActiveStaffUser()) {
  if (!isStaffWorkspaceView(staffUser)) return true;

  const blockedExactPaths = [
    "/admin/financial",
    "/admin/staff-users",
    "/admin/sales",
  ];
  const blockedPathPrefixes = [
    "/admin/customers",
    "/admin/products",
    "/admin/quotes/archived",
  ];

  return !(
    blockedExactPaths.includes(pathname) ||
    blockedPathPrefixes.some((prefix) => pathname.startsWith(prefix))
  );
}
