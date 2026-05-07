const STORAGE_KEY = "teeCoStaffUsers";
const ACTIVE_STAFF_KEY = "teeCoActiveStaffUser";

export const OWNER_USER_ID = "staff-owner-default";
export const DEFAULT_OWNER_PIN = "1234";
export const STAFF_ROLES = ["Owner", "Manager", "Staff"];
export const STAFF_STATUSES = ["Active", "Inactive"];

const DEFAULT_OWNER_USER = {
  id: OWNER_USER_ID,
  name: "Owner / Admin",
  role: "Owner",
  pin: DEFAULT_OWNER_PIN,
  status: "Active",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function sanitizePin(pin) {
  return String(pin || "").replace(/\D/g, "").slice(0, 4).padStart(4, "0");
}

function normalizeStatus(user) {
  if (user?.disabled === true) return "Inactive";
  if (user?.disabled === false) return "Active";
  return STAFF_STATUSES.includes(user?.status) ? user.status : "Active";
}

function normalizeRole(role, isOwner) {
  if (isOwner) return "Owner";
  if (role === "Owner") return "Staff";
  return STAFF_ROLES.includes(role) ? role : "Staff";
}

function normalizeStaffUser(user, options = {}) {
  const isOwner = options.isOwner === true;

  return {
    id: user?.id || `staff-${Date.now()}`,
    name: String(user?.name || "New Staff User").trim() || "New Staff User",
    role: normalizeRole(user?.role, isOwner),
    pin: isOwner ? DEFAULT_OWNER_PIN : sanitizePin(user?.pin || "0000"),
    status: isOwner ? "Active" : normalizeStatus(user),
    created_at: user?.created_at || new Date().toISOString(),
    updated_at: user?.updated_at || new Date().toISOString(),
  };
}

function buildDefaultOwnerUser(sourceUser) {
  return normalizeStaffUser(
    {
      ...DEFAULT_OWNER_USER,
      ...(sourceUser || {}),
      id: OWNER_USER_ID,
      name: DEFAULT_OWNER_USER.name,
      role: "Owner",
      pin: DEFAULT_OWNER_PIN,
      status: "Active",
    },
    { isOwner: true }
  );
}

function findNextAvailablePin(usedPins) {
  for (let value = 0; value <= 9999; value += 1) {
    const pin = String(value).padStart(4, "0");
    if (!usedPins.has(pin)) {
      return pin;
    }
  }

  throw new Error("No available 4-digit staff PINs remain.");
}

function canonicalizeStaffUsers(users) {
  const sourceUsers = Array.isArray(users) ? users : [];
  const ownerSource =
    sourceUsers.find((user) => user?.id === OWNER_USER_ID) ||
    sourceUsers.find((user) => user?.role === "Owner");

  const ownerUser = buildDefaultOwnerUser(ownerSource);
  const usedPins = new Set([ownerUser.pin]);
  const nextUsers = [ownerUser];

  sourceUsers.forEach((user) => {
    if (!user || user.id === OWNER_USER_ID) return;

    const normalizedUser = normalizeStaffUser(user);
    const role = normalizedUser.role === "Owner" ? "Staff" : normalizedUser.role;
    let pin = sanitizePin(normalizedUser.pin);

    if (usedPins.has(pin)) {
      pin = findNextAvailablePin(usedPins);
    }

    usedPins.add(pin);
    nextUsers.push({
      ...normalizedUser,
      role,
      pin,
      status: normalizeStatus(normalizedUser),
      updated_at: normalizedUser.updated_at || new Date().toISOString(),
    });
  });

  return nextUsers;
}

function persistRawStaffUsers(users) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function readRawStaffUsers() {
  if (typeof window === "undefined") return [DEFAULT_OWNER_USER];

  const rawUsers = window.localStorage.getItem(STORAGE_KEY);
  if (!rawUsers) return [DEFAULT_OWNER_USER];

  const parsedUsers = JSON.parse(rawUsers);
  return Array.isArray(parsedUsers) && parsedUsers.length > 0
    ? parsedUsers
    : [DEFAULT_OWNER_USER];
}

function syncStoredStaffUsers() {
  const nextUsers = canonicalizeStaffUsers(readRawStaffUsers());
  persistRawStaffUsers(nextUsers);
  return nextUsers;
}

function getStoredStaffUserById(userId) {
  return getStoredStaffUsers().find((user) => user.id === userId) || null;
}

function assertFourDigitPin(pin) {
  const cleanedPin = String(pin || "").replace(/\D/g, "").slice(0, 4);
  if (!/^\d{4}$/.test(cleanedPin)) {
    throw new Error("PIN must be exactly 4 digits.");
  }
  return cleanedPin;
}

function assertUniquePin(pin, excludedUserId = null) {
  const cleanedPin = assertFourDigitPin(pin);
  const existingUser = getStoredStaffUsers().find(
    (user) => user.id !== excludedUserId && user.pin === cleanedPin
  );

  if (existingUser) {
    throw new Error(`PIN ${cleanedPin} is already assigned to ${existingUser.name}.`);
  }

  return cleanedPin;
}

function syncActiveStaffSession(staffUsers = null) {
  if (typeof window === "undefined") return null;

  const currentSession = getStoredActiveStaffSession();
  if (!currentSession?.id) return null;

  const users = staffUsers || getStoredStaffUsers();
  const matchedUser = users.find((user) => user.id === currentSession.id) || null;

  if (!matchedUser || matchedUser.status !== "Active") {
    window.localStorage.removeItem(ACTIVE_STAFF_KEY);
    return null;
  }

  window.localStorage.setItem(
    ACTIVE_STAFF_KEY,
    JSON.stringify({ id: matchedUser.id })
  );
  return matchedUser;
}

function getStoredActiveStaffSession() {
  if (typeof window === "undefined") return null;

  try {
    const rawUser = window.localStorage.getItem(ACTIVE_STAFF_KEY);
    if (!rawUser) return null;

    const parsedUser = JSON.parse(rawUser);
    if (typeof parsedUser === "string") {
      return { id: parsedUser };
    }

    return parsedUser && typeof parsedUser === "object"
      ? { id: parsedUser.id || "" }
      : null;
  } catch (error) {
    console.error("Unable to read active Tee & Co staff user", error);
    return null;
  }
}

export function getStoredStaffUsers() {
  if (typeof window === "undefined") return [DEFAULT_OWNER_USER];

  try {
    return syncStoredStaffUsers();
  } catch (error) {
    console.error("Unable to read Tee & Co staff users", error);
    return [DEFAULT_OWNER_USER];
  }
}

export function getActiveStaffUsers() {
  return getStoredStaffUsers().filter((user) => user.status === "Active");
}

export function saveStoredStaffUsers(users) {
  const nextUsers = canonicalizeStaffUsers(users);
  persistRawStaffUsers(nextUsers);
  syncActiveStaffSession(nextUsers);
}

export function createStoredStaffUser(userInput) {
  if (userInput?.role === "Owner") {
    throw new Error("Only the protected default Owner account is allowed.");
  }

  const currentUsers = getStoredStaffUsers();
  const createdAt = new Date().toISOString();
  const pin = assertUniquePin(userInput?.pin);

  const user = normalizeStaffUser({
    id: `staff-${Date.now()}`,
    name: userInput?.name,
    role: userInput?.role,
    pin,
    status: userInput?.status || "Active",
    created_at: createdAt,
    updated_at: createdAt,
  });

  const nextUsers = [...currentUsers, user];
  saveStoredStaffUsers(nextUsers);
  return user;
}

export function updateStoredStaffUser(userId, userInput) {
  const currentUsers = getStoredStaffUsers();
  const currentUser = currentUsers.find((user) => user.id === userId);

  if (!currentUser) {
    throw new Error("Staff user not found.");
  }

  if (userId === OWNER_USER_ID) {
    if (userInput?.role && userInput.role !== "Owner") {
      throw new Error("The default Owner account role cannot be changed.");
    }

    if (userInput?.status && userInput.status !== "Active") {
      throw new Error("The default Owner account cannot be disabled.");
    }

    if (Object.prototype.hasOwnProperty.call(userInput || {}, "pin")) {
      throw new Error("The default Owner PIN is protected.");
    }
  }

  if (userInput?.role === "Owner" && userId !== OWNER_USER_ID) {
    throw new Error("Additional Owner accounts are not allowed.");
  }

  let updatedUser = null;
  const nextUsers = currentUsers.map((user) => {
    if (user.id !== userId) return user;

    const nextPin = Object.prototype.hasOwnProperty.call(userInput || {}, "pin")
      ? assertUniquePin(userInput.pin, userId)
      : user.pin;

    updatedUser = normalizeStaffUser({
      ...user,
      ...userInput,
      id: user.id,
      role: userId === OWNER_USER_ID ? "Owner" : userInput?.role || user.role,
      pin: nextPin,
      status: userId === OWNER_USER_ID ? "Active" : userInput?.status || user.status,
      created_at: user.created_at,
      updated_at: new Date().toISOString(),
    });

    return updatedUser;
  });

  saveStoredStaffUsers(nextUsers);
  return updatedUser;
}

export function resetStoredStaffUserPin(userId, newPin) {
  return updateStoredStaffUser(userId, { pin: newPin });
}

export function disableStoredStaffUser(userId) {
  if (userId === OWNER_USER_ID) {
    throw new Error("The default Owner account cannot be disabled.");
  }

  return updateStoredStaffUser(userId, { status: "Inactive" });
}

export function reactivateStoredStaffUser(userId) {
  return updateStoredStaffUser(userId, { status: "Active" });
}

export function validateStaffPin(pin, userId = null) {
  const cleanedPin = String(pin || "").trim();
  return getActiveStaffUsers().find(
    (user) => user.pin === cleanedPin && (!userId || user.id === userId)
  ) || null;
}

export function authenticateStaffUser(userId, pin) {
  if (!userId) return null;
  return validateStaffPin(pin, userId);
}

export function setActiveStaffUser(user) {
  if (typeof window === "undefined") return;

  if (!user) {
    window.localStorage.removeItem(ACTIVE_STAFF_KEY);
    return;
  }

  const userId = typeof user === "string" ? user : user.id;
  const storedUser = getStoredStaffUserById(userId);

  if (!storedUser || storedUser.status !== "Active") {
    window.localStorage.removeItem(ACTIVE_STAFF_KEY);
    return;
  }

  window.localStorage.setItem(
    ACTIVE_STAFF_KEY,
    JSON.stringify({ id: storedUser.id })
  );
}

export function getActiveStaffUser() {
  if (typeof window === "undefined") return null;

  try {
    return syncActiveStaffSession();
  } catch (error) {
    console.error("Unable to resolve active Tee & Co staff user", error);
    return null;
  }
}

export function isActiveStaffOwner() {
  return getActiveStaffUser()?.role === "Owner";
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
