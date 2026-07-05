export type PlanType = '1_device' | '2_devices' | 'unlimited';

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
  'test0001': '1_device',
  'test0002': '2_devices',
  'test1000': 'unlimited'
};

const getLimit = (plan: PlanType) => {
  if (plan === '1_device') return 1;
  if (plan === '2_devices') return 2;
  return 9999; // unlimited
};

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
  if (!account) return 'not_found';

  const device = account.devices.find(d => d.deviceId === deviceId);
  if (device) {
    // Update last active time to prevent being kicked out easily if tracking inactivity later
    device.lastActive = Date.now();
    return 'valid';
  }
  return 'invalid';
};
