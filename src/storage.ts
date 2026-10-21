import type { UserData, SeenEntry } from './types.ts';

const STORAGE_KEY = 'longwatch:v1';

function now(): string {
  return new Date().toISOString();
}

function empty(): UserData {
  return { version: 1, updatedAt: now(), seen: {} };
}

export function loadUserData(): UserData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as UserData;
    if (parsed.version !== 1) return empty();
    return parsed;
  } catch {
    return empty();
  }
}

function save(data: UserData): void {
  try {
    data.updatedAt = now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable (private mode quota, etc.) — fail silently
  }
}

export function toggleSeen(imdbId: string, seenEntry?: SeenEntry): UserData {
  const data = loadUserData();
  if (data.seen[imdbId]) {
    delete data.seen[imdbId];
  } else {
    data.seen[imdbId] = seenEntry ?? { seenAt: now().slice(0, 10) };
  }
  save(data);
  return data;
}

export function setSeen(imdbId: string, entry: SeenEntry): UserData {
  const data = loadUserData();
  data.seen[imdbId] = entry;
  save(data);
  return data;
}

export function setUnseen(imdbId: string): UserData {
  const data = loadUserData();
  delete data.seen[imdbId];
  save(data);
  return data;
}

export function getSettings(data: UserData): NonNullable<UserData['settings']> {
  return data.settings ?? { view: 'grid', country: 'CA' };
}

export function saveSettings(
  partial: Partial<NonNullable<UserData['settings']>>,
): UserData {
  const data = loadUserData();
  data.settings = { ...getSettings(data), ...partial };
  save(data);
  return data;
}

export function saveLastSeenDataVersion(generatedAt: string): void {
  const data = loadUserData();
  data.lastSeenDataVersion = generatedAt;
  save(data);
}

export function replaceUserData(incoming: UserData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...incoming, updatedAt: now() }));
  } catch { /* ignore */ }
}

export function mergeUserData(incoming: UserData): void {
  const current = loadUserData();
  const merged: UserData['seen'] = { ...current.seen };
  for (const [id, entry] of Object.entries(incoming.seen)) {
    const existing = current.seen[id];
    if (!existing) {
      merged[id] = entry;
    } else if (entry.seenAt && existing.seenAt && entry.seenAt > existing.seenAt) {
      merged[id] = entry;
    }
  }
  current.seen = merged;
  save(current);
}
