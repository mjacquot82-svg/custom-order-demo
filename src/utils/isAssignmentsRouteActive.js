export function isAssignmentsRouteActive(pathname = "") {
  return pathname === "/admin/assignments" || pathname.startsWith("/admin/assignments/");
}
