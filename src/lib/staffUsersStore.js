const STORAGE_KEY = "teeCoStaffUsers";
const ACTIVE_STAFF_KEY = "teeCoActiveStaffUser";
const STAFF_USERS_UPDATED_EVENT = "tee-co-staff-users-updated";
const PROTECTED_OWNER_ID = "staff-owner-default";

export const STAFF_ROLES = ["Owner", "Manager", "Staff"];
export const STAFF_STATUSES = ["Active", "Inactive"];

const DEFAULT_STAFF_USERS = [
  {
    id: "staff-owner-default",
    name: "Owner / Admin",
    role: "Owner",
    pin: "1234",
    status: "Active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function cleanStaffPin(pin) {
  return String(pin ?? "").replace(/\D/g, "").slice(0, 4);
}

function formatStaffPin(pin) {
  return cleanStaffPin(pin).padStart(4, "0");
}

function validateStaffUserName(name) {
  const trimmedName = String(name ?? "").trim();
  if (!trimmedName) {
    throw new Error("Name is required.");
  }

  return trimmedName;
}

function validateUniqueStaffPin(pin, users, excludedUserId) {
  const cleanedPin = cleanStaffPin(pin);

  if (cleanedPin.length !== 4) {
    throw new Error("PIN must be exactly 4 digits.");
  }

  const hasDuplicatePin = users.some(
    (user) => user.id !== excludedUserId && cleanStaffPin(user.pin) === cleanedPin
  );

  if (hasDuplicatePin) {
    throw new Error("PIN is already assigned to another staff account.");
  }

  return cleanedPin;
}

function prepareStaffUserInput(userInput, users, excludedUserId) {
  const nextInput = { ...userInput };

  if (Object.prototype.hasOwnProperty.call(nextInput, "name")) {
    nextInput.name = validateStaffUserName(nextInput.name);
  }

  if (Object.prototype.hasOwnProperty.call(nextInput, "pin")) {
    nextInput.pin = validateUniqueStaffPin(nextInput.pin, users, excludedUserId);
  }

  return nextInput;
}

function normalizeStaffUser(user) {
  const isProtectedOwner = user.id === PROTECTED_OWNER_ID;
  const fallbackRole = isProtectedOwner ? "Owner" : "Staff";

  return {
    id: user.id || `staff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: user.name || "New Staff User",
    role: isProtectedOwner
      ? "Owner"
      : user.role === "Owner"
        ? "Staff"
        : STAFF_ROLES.includes(user.role)
          ? user.role
          : fallbackRole,
    pin: formatStaffPin(user.pin || "0000"),
    status: isProtectedOwner
      ? "Active"
      : STAFF_STATUSES.includes(user.status)
        ? user.status
        : "Active",
    created_at: user.created_at || new Date().toISOString(),
    updated_at: user.updated_at || new Date().toISOString(),
  };
}

function buildPersistedStaffUsers(users) {
  const normalizedUsers = Array.isArray(users) ? users.map(normalizeStaffUser) : [];
  const nonProtectedUsers = normalizedUsers.filter((user) => user.id !== PROTECTED_OWNER_ID);
  const protectedOwner =
    normalizedUsers.find((user) => user.id === PROTECTED_OWNER_ID) || DEFAULT_STAFF_USERS[0];

  return [normalizeStaffUser(protectedOwner), ...nonProtectedUsers];
}

function emitStaffUsersUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STAFF_USERS_UPDATED_EVENT));
}

export function getStoredStaffUsers() {
  if (typeof window === "undefined") return DEFAULT_STAFF_USERS;

  try {
    const rawUsers = window.localStorage.getItem(STORAGE_KEY);
    if (rawUsers) {
      const parsedUsers = JSON.parse(rawUsers);
      if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
        const normalizedUsers = buildPersistedStaffUsers(parsedUsers);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedUsers));
        return normalizedUsers;
      }
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STAFF_USERS));
    return DEFAULT_STAFF_USERS;
  } catch (error) {
    console.error("Unable to read Tee & Co staff users", error);
    return DEFAULT_STAFF_USERS;
  }
}

export function saveStoredStaffUsers(users) {
  if (typeof window === "undefined") return;
  const normalizedUsers = buildPersistedStaffUsers(users);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedUsers));
  emitStaffUsersUpdated();
}

export function createStoredStaffUser(userInput) {
  const currentUsers = getStoredStaffUsers();
  const createdAt = new Date().toISOString();
  const nextInput = prepareStaffUserInput(userInput, currentUsers);

  const user = normalizeStaffUser({
    id: `staff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: nextInput.name,
    role: nextInput.role,
    pin: nextInput.pin,
    status: nextInput.status || "Active",
    created_at: createdAt,
    updated_at: createdAt,
  });

  const nextUsers = [user, ...currentUsers];
  saveStoredStaffUsers(nextUsers);
  return user;
}

export function updateStoredStaffUser(userId, userInput) {
  const currentUsers = getStoredStaffUsers();
  const staffUser = currentUsers.find((user) => user.id === userId);
  const isProtectedOwner = isProtectedStaffUser(staffUser);
  const nextInput = prepareStaffUserInput(userInput, currentUsers, userId);
  let updatedUser = null;

  const nextUsers = currentUsers.map((user) => {
    if (user.id !== userId) return user;

    const nextRole = isProtectedOwner
      ? "Owner"
      : nextInput.role === undefined
        ? user.role
        : nextInput.role;
    const nextStatus = isProtectedOwner
      ? "Active"
      : nextInput.status === undefined
        ? user.status
        : nextInput.status;

    updatedUser = normalizeStaffUser({
      ...user,
      ...nextInput,
      role: nextRole,
      status: nextStatus,
      id: user.id,
      created_at: user.created_at,
      updated_at: new Date().toISOString(),
    });

    return updatedUser;
  });

  saveStoredStaffUsers(nextUsers);

  const activeStaff = getActiveStaffUser();
  if (activeStaff?.id === userId && updatedUser) {
    if (updatedUser.status === "Inactive") {
      setActiveStaffUser(null);
    } else {
      setActiveStaffUser(updatedUser);
    }
  }

  return updatedUser;
}

export function disableStoredStaffUser(userId) {
  const staffUser = getStoredStaffUsers().find((user) => user.id === userId);
  if (staffUser && isProtectedStaffUser(staffUser)) {
    return staffUser;
  }

  return updateStoredStaffUser(userId, { status: "Inactive" });
}

export function reactivateStoredStaffUser(userId) {
  return updateStoredStaffUser(userId, { status: "Active" });
}

export function validateStaffPin(pin) {
  const cleanedPin = cleanStaffPin(pin);
  return getStoredStaffUsers().find(
    (user) => user.status !== "Inactive" && user.pin === cleanedPin
  );
}

export function setActiveStaffUser(user) {
  if (typeof window === "undefined") return;
  if (!user) {
    window.localStorage.removeItem(ACTIVE_STAFF_KEY);
    return;
  }

  window.localStorage.setItem(
    ACTIVE_STAFF_KEY,
    JSON.stringify({ id: user.id, name: user.name, role: user.role })
  );
}

export function getActiveStaffUser() {
  if (typeof window === "undefined") return null;

  try {
    const rawUser = window.localStorage.getItem(ACTIVE_STAFF_KEY);
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    console.error("Unable to read active Tee & Co staff user", error);
    return null;
  }
}

export function isActiveStaffOwner() {
  return getActiveStaffUser()?.role === "Owner";
}

export function isProtectedStaffUser(user) {
  return user?.id === PROTECTED_OWNER_ID || user?.role === "Owner";
}

export function generateUniqueStaffPin(excludedUserId) {
  const users = getStoredStaffUsers();

  for (let pinNumber = 0; pinNumber <= 9999; pinNumber += 1) {
    const candidatePin = formatStaffPin(pinNumber);
    const hasDuplicatePin = users.some(
      (user) => user.id !== excludedUserId && user.pin === candidatePin
    );

    if (!hasDuplicatePin) {
      return candidatePin;
    }
  }

  throw new Error("No available PINs remaining.");
}

export function subscribeToStaffUsers(listener) {
  if (typeof window === "undefined") {
    return () => {};
  }

  function handleStorage(event) {
    if (!event || event.key === STORAGE_KEY) {
      listener(getStoredStaffUsers());
    }
  }

  function handleCustomEvent() {
    listener(getStoredStaffUsers());
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STAFF_USERS_UPDATED_EVENT, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STAFF_USERS_UPDATED_EVENT, handleCustomEvent);
  };
}

export function buildStaffAuditFields(prefix = "created") {
  const activeStaff = getActiveStaffUser();

  if (!activeStaff) {
    return {
      [`${prefix}_by_staff_id`]: "",
      [`${prefix}_by_staff_name`]: "Unknown Staff",
      [`${prefix}_by_staff_role`]: "",
    };
  }

  return {
    [`${prefix}_by_staff_id`]: activeStaff.id || "",
    [`${prefix}_by_staff_name`]: activeStaff.name || "Unknown Staff",
    [`${prefix}_by_staff_role`]: activeStaff.role || "",
  };
}
