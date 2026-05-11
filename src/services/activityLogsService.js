import { createCrudService } from "./createCrudService";

const localActivityLogs = [];

const activityLogsService = createCrudService({
  table: "activity_logs",
  local: {
    list: () => localActivityLogs,
    getById: (activityLogId) =>
      localActivityLogs.find((activityLog) => activityLog.id === activityLogId) || null,
    create: (activityLog) => {
      localActivityLogs.unshift(activityLog);
      return activityLog;
    },
    update: (activityLogId, updates) => {
      const matchedIndex = localActivityLogs.findIndex(
        (activityLog) => activityLog.id === activityLogId
      );

      if (matchedIndex === -1) return null;

      localActivityLogs[matchedIndex] = {
        ...localActivityLogs[matchedIndex],
        ...updates,
      };

      return localActivityLogs[matchedIndex];
    },
  },
});

export default activityLogsService;

export const listActivityLogs = () => activityLogsService.list();
export const getActivityLogById = (activityLogId) =>
  activityLogsService.getById(activityLogId);
export const createActivityLogRecord = (activityLog) => activityLogsService.create(activityLog);

