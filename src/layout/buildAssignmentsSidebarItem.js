import { assignmentSidebarLink } from "../config/adminAssignmentNavLink";

export function buildAssignmentsSidebarItem(count = 0) {
  return {
    ...assignmentSidebarLink,
    count,
    highlightWhenActive: true,
  };
}
