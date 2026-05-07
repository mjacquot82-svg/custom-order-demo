import { isAssignmentsRouteActive } from "../utils/isAssignmentsRouteActive";
import { buildSidebarAssignmentBadge } from "./buildSidebarAssignmentBadge";

export function buildAssignmentsNavigationState({ pathname = "", count = 0 } = {}) {
  return {
    active: isAssignmentsRouteActive(pathname),
    badge: buildSidebarAssignmentBadge(count),
  };
}
