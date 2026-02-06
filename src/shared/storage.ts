// ============================================================================
// StageWhisper - Storage Layer
// Handles persistence with schema versioning and migrations
// ============================================================================

import {
    StorageSchema,
    Script,
    Folder,
    Settings,
    LayoutProfile,
    SiteLayout,
    LastSession,
    SCHEMA_VERSION,
    DEFAULT_SETTINGS,
    DEFAULT_NOTCH_LAYOUT,
    DEFAULT_OVERLAY_LAYOUT,
} from './types';

// ============================================================================
// Default Storage State
// ============================================================================

const DEFAULT_STORAGE: StorageSchema = {
    schemaVersion: SCHEMA_VERSION,
    scripts: [],
    folders: [],
    settings: DEFAULT_SETTINGS,
    layouts: [DEFAULT_NOTCH_LAYOUT, DEFAULT_OVERLAY_LAYOUT],
    siteLayouts: [],
    lastSession: undefined,
};

// ============================================================================
// Migrations
// ============================================================================

type MigrationFn = (data: Partial<StorageSchema>) => Partial<StorageSchema>;

const migrations: Record<number, MigrationFn> = {
    // Migration from version 0 (initial install) to version 1
    1: (data) => ({
        ...DEFAULT_STORAGE,
        ...data,
        schemaVersion: 1,
    }),
    // Future migrations go here:
    // 2: (data) => { ... },
};

async function migrate(data: Partial<StorageSchema>): Promise<StorageSchema> {
    let currentVersion = data.schemaVersion ?? 0;

    while (currentVersion < SCHEMA_VERSION) {
        const nextVersion = currentVersion + 1;
        const migrationFn = migrations[nextVersion];

        if (!migrationFn) {
            throw new Error(`Missing migration for version ${nextVersion}`);
        }

        data = migrationFn(data);
        currentVersion = nextVersion;
    }

    return data as StorageSchema;
}

// ============================================================================
// Storage API
// ============================================================================

/**
 * Initialize storage - run migrations if needed
 */
export async function initializeStorage(): Promise<StorageSchema> {
    const data = await chrome.storage.local.get(null);
    const migrated = await migrate(data as Partial<StorageSchema>);

    // Save migrated data if version changed
    if (data.schemaVersion !== migrated.schemaVersion) {
        await chrome.storage.local.set(migrated);
    }

    return migrated;
}

/**
 * Get all storage data
 */
export async function getStorage(): Promise<StorageSchema> {
    const data = await chrome.storage.local.get(null);
    return data as StorageSchema;
}

// ============================================================================
// Scripts CRUD
// ============================================================================

export async function getScripts(): Promise<Script[]> {
    const { scripts = [] } = await chrome.storage.local.get('scripts');
    return scripts;
}

export async function getScript(id: string): Promise<Script | undefined> {
    const scripts = await getScripts();
    return scripts.find((s) => s.id === id);
}

export async function saveScript(script: Script): Promise<void> {
    const scripts = await getScripts();
    const index = scripts.findIndex((s) => s.id === script.id);

    if (index >= 0) {
        scripts[index] = { ...script, updatedAt: Date.now() };
    } else {
        scripts.push({ ...script, createdAt: Date.now(), updatedAt: Date.now() });
    }

    await chrome.storage.local.set({ scripts });
}

export async function deleteScript(id: string): Promise<Script | undefined> {
    const scripts = await getScripts();
    const index = scripts.findIndex((s) => s.id === id);

    if (index < 0) return undefined;

    const [deleted] = scripts.splice(index, 1);
    await chrome.storage.local.set({ scripts });
    return deleted;
}

export async function duplicateScript(id: string): Promise<Script | undefined> {
    const script = await getScript(id);
    if (!script) return undefined;

    const duplicate: Script = {
        ...script,
        id: generateId(),
        title: `${script.title} (copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    await saveScript(duplicate);
    return duplicate;
}

// ============================================================================
// Folders CRUD
// ============================================================================

export async function getFolders(): Promise<Folder[]> {
    const { folders = [] } = await chrome.storage.local.get('folders');
    return folders;
}

export async function saveFolder(folder: Folder): Promise<void> {
    const folders = await getFolders();
    const index = folders.findIndex((f) => f.id === folder.id);

    if (index >= 0) {
        folders[index] = folder;
    } else {
        folders.push({ ...folder, createdAt: Date.now() });
    }

    await chrome.storage.local.set({ folders });
}

export async function deleteFolder(id: string): Promise<void> {
    const folders = await getFolders();
    const filtered = folders.filter((f) => f.id !== id);
    await chrome.storage.local.set({ folders: filtered });

    // Move scripts in this folder to root
    const scripts = await getScripts();
    const updated = scripts.map((s) => (s.folderId === id ? { ...s, folderId: undefined } : s));
    await chrome.storage.local.set({ scripts: updated });
}

// ============================================================================
// Settings
// ============================================================================

export async function getSettings(): Promise<Settings> {
    const { settings } = await chrome.storage.local.get('settings');
    return { ...DEFAULT_SETTINGS, ...settings };
}

export async function saveSettings(settings: Partial<Settings>): Promise<Settings> {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await chrome.storage.local.set({ settings: updated });
    return updated;
}

// ============================================================================
// Layouts
// ============================================================================

export async function getLayouts(): Promise<LayoutProfile[]> {
    const { layouts = [DEFAULT_NOTCH_LAYOUT, DEFAULT_OVERLAY_LAYOUT] } =
        await chrome.storage.local.get('layouts');
    return layouts;
}

export async function saveLayout(layout: LayoutProfile): Promise<void> {
    const layouts = await getLayouts();
    const index = layouts.findIndex((l) => l.profileId === layout.profileId);

    if (index >= 0) {
        layouts[index] = layout;
    } else {
        layouts.push(layout);
    }

    await chrome.storage.local.set({ layouts });
}

export async function getSiteLayouts(): Promise<SiteLayout[]> {
    const { siteLayouts = [] } = await chrome.storage.local.get('siteLayouts');
    return siteLayouts;
}

export async function saveSiteLayout(host: string, layoutProfileId: string): Promise<void> {
    const siteLayouts = await getSiteLayouts();
    const existing = siteLayouts.find((sl) => sl.host === host);

    if (existing) {
        existing.layoutProfileId = layoutProfileId;
    } else {
        siteLayouts.push({ host, layoutProfileId });
    }

    await chrome.storage.local.set({ siteLayouts });
}

// ============================================================================
// Last Session (for resume)
// ============================================================================

export async function getLastSession(): Promise<LastSession | undefined> {
    const { lastSession } = await chrome.storage.local.get('lastSession');
    return lastSession;
}

export async function saveLastSession(session: LastSession): Promise<void> {
    await chrome.storage.local.set({ lastSession: { ...session, savedAt: Date.now() } });
}

export async function clearLastSession(): Promise<void> {
    await chrome.storage.local.remove('lastSession');
}

// ============================================================================
// Utilities
// ============================================================================

export function generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Export all data for backup
 */
export async function exportData(): Promise<StorageSchema> {
    return getStorage();
}

/**
 * Import data from backup
 */
export async function importData(data: Partial<StorageSchema>): Promise<void> {
    const migrated = await migrate(data);
    await chrome.storage.local.set(migrated);
}

/**
 * Clear all data (factory reset)
 */
export async function clearAllData(): Promise<void> {
    await chrome.storage.local.clear();
    await chrome.storage.local.set(DEFAULT_STORAGE);
}
