export type PlanType = 'solo' | 'clinic';

interface DeviceSession {
  deviceId: string;
  lastActive: number;
}

interface UserAccount {
  email: string;
  plan: PlanType;
  devices: DeviceSession[];
}

// In-memory store (Prototype Use Only. Resets on server restart).
// For Vercel production, replace with Vercel KV, Redis, or Supabase.
// Using global variable to prevent hot-reloading from clearing it in dev mode if possible.
const globalStore = global as unknown as { __sessionStore: Map<string, UserAccount> };
if (!globalStore.__sessionStore) {
  globalStore.__sessionStore = new Map<string, UserAccount>();
}
const store = globalStore.__sessionStore;

export const PASSWORDS: Record<string, PlanType> = {
  'test0001': 'solo',
  'clinic_test': 'clinic'
};

const getLimit = (plan: PlanType) => (plan === 'solo' ? 1 : 5);

export const registerDevice = (email: string, plan: PlanType, deviceId: string) => {
  let account = store.get(email);
  if (!account) {
    account = { email, plan, devices: [] };
    store.set(email, account);
  }

  // Remove device if it already exists to update its lastActive timestamp
  account.devices = account.devices.filter(d => d.deviceId !== deviceId);

  // Add the new session
  account.devices.push({ deviceId, lastActive: Date.now() });

  // Enforce concurrent limits
  const limit = getLimit(plan);
  if (account.devices.length > limit) {
    // Sort by last active ascending (oldest first)
    account.devices.sort((a, b) => a.lastActive - b.lastActive);
    // Slice to keep only the newest 'limit' devices, effectively kicking out the oldest.
    account.devices = account.devices.slice(account.devices.length - limit);
  }
};

export const isDeviceValid = (email: string, deviceId: string) => {
  const account = store.get(email);
  if (!account) return false;

  const device = account.devices.find(d => d.deviceId === deviceId);
  if (device) {
    // Update last active time to prevent being kicked out easily if tracking inactivity later
    device.lastActive = Date.now();
    return true;
  }
  return false;
};
