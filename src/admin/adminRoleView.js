import { getActiveStaffUser } from "../lib/staffUsersStore";

export function getAdminViewer(staffUser = getActiveStaffUser()) {
  return staffUser || null;
}

export function isOwnerView(staffUser = getActiveStaffUser()) {
  return getAdminViewer(staffUser)?.role === "Owner";
}

export function isStaffWorkspaceView(staffUser = getActiveStaffUser()) {
  const viewer = getAdminViewer(staffUser);
  return Boolean(viewer) && viewer.role !== "Owner";
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

export function canAccessOwnerWorkspace(pathname, staffUser = getActiveStaffUser()) {
  if (!isStaffWorkspaceView(staffUser)) return true;

  return ![
    "/admin/financial",
    "/admin/staff-users",
    "/admin/customers",
    "/admin/products",
    "/admin/sales",
    "/admin/quotes/archived",
  ].some((prefix) => pathname.startsWith(prefix));
}
