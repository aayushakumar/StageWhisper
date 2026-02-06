// ============================================================================
// StageWhisper - Core Type Definitions
// ============================================================================

/**
 * Script - A teleprompter script document
 */
export interface Script {
    id: string;
    title: string;
    body: string; // Plain text or markdown
    createdAt: number;
    updatedAt: number;
    tags: string[];
    folderId?: string;
    lastCursor?: number; // Character position for resume
    lastLine?: number; // Line index for resume
}

/**
 * Folder - Organize scripts into folders
 */
export interface Folder {
    id: string;
    name: string;
    parentId?: string;
    createdAt: number;
}

/**
 * ThemeName - Theme options
 */
export type ThemeName = 'glass' | 'dark' | 'light';

/**
 * Settings - User preferences
 */
export interface Settings {
    // Typography
    fontFamily: string;
    fontSizePx: number;
    lineHeight: number;

    // Theme
    theme: ThemeName | 'custom';
    backgroundOpacity: number;
    customColors?: {
        background: string;
        text: string;
        highlight: string;
    };

    // Reading aids
    focusBand: boolean;
    mirrorMode: boolean;
    showNextLine: boolean;
    nextLineOpacity: number;

    // Playback
    defaultSpeedWpm: number;
    beatRewindLines: number;

    // Behavior
    clickThroughDefault: boolean;
    meetingModeAutoEnable: boolean;
    meetingModeDomains: string[];

    // Shortcuts (command → key combo)
    shortcuts: Record<string, string>;
}

/**
 * LayoutProfile - Position and size configuration for overlay/notch
 */
export interface LayoutProfile {
    profileId: string;
    name: string;
    mode: 'notch' | 'overlay';
    anchor: 'top-center' | 'top-left' | 'top-right' | 'custom';
    offsetX: number;
    offsetY: number;
    width: number; // px
    height: number; // px
    clickThrough: boolean;
    compactLines: 1 | 2 | 3;
}

/**
 * SiteLayout - Per-domain layout override
 */
export interface SiteLayout {
    host: string; // eTLD+1
    layoutProfileId: string;
}

/**
 * PlaybackState - Current playback status
 */
export interface PlaybackState {
    playing: boolean;
    speed: number; // WPM
    position: number; // Scroll offset in px
    currentLine: number;
    totalLines: number;
    estimatedTimeRemaining: number; // seconds
}

/**
 * Session - A live playback instance
 */
export interface Session {
    sessionId: string;
    tabId?: number;
    mode: 'overlay' | 'pip' | 'window';
    scriptId: string;
    playbackState: PlaybackState;
    hidden: boolean;
    createdAt: number;
}

/**
 * LastSession - Persisted for resume functionality
 */
export interface LastSession {
    scriptId: string;
    position: number;
    line: number;
    savedAt: number;
}

// ============================================================================
// Messaging Types
// ============================================================================

export type MessageType =
    | 'SESSION_START'
    | 'SESSION_END'
    | 'STATE_UPDATE'
    | 'COMMAND'
    | 'SCRIPT_UPDATE'
    | 'LAYOUT_UPDATE'
    | 'PANIC_HIDE'
    | 'INJECT_OVERLAY';

export interface BaseMessage {
    type: MessageType;
    timestamp: number;
}

export interface SessionStartMessage extends BaseMessage {
    type: 'SESSION_START';
    session: Session;
}

export interface SessionEndMessage extends BaseMessage {
    type: 'SESSION_END';
    sessionId: string;
}

export interface StateUpdateMessage extends BaseMessage {
    type: 'STATE_UPDATE';
    sessionId: string;
    playbackState: Partial<PlaybackState>;
}

export type Command =
    | 'play'
    | 'pause'
    | 'toggle_play'
    | 'speed_up'
    | 'speed_down'
    | 'rewind'
    | 'forward'
    | 'seek'
    | 'hide'
    | 'show'
    | 'toggle_hide';

export interface CommandMessage extends BaseMessage {
    type: 'COMMAND';
    command: Command;
    payload?: {
        seekPosition?: number;
        speed?: number;
    };
}

export interface ScriptUpdateMessage extends BaseMessage {
    type: 'SCRIPT_UPDATE';
    script: Script;
}

export interface PanicHideMessage extends BaseMessage {
    type: 'PANIC_HIDE';
    hidden: boolean;
}

export interface InjectOverlayMessage extends BaseMessage {
    type: 'INJECT_OVERLAY';
    tabId: number;
    scriptId: string;
}

export type Message =
    | SessionStartMessage
    | SessionEndMessage
    | StateUpdateMessage
    | CommandMessage
    | ScriptUpdateMessage
    | PanicHideMessage
    | InjectOverlayMessage;

// ============================================================================
// Storage Schema
// ============================================================================

export interface StorageSchema {
    schemaVersion: number;
    scripts: Script[];
    folders: Folder[];
    settings: Settings;
    layouts: LayoutProfile[];
    siteLayouts: SiteLayout[];
    lastSession?: LastSession;
}

// ============================================================================
// Constants
// ============================================================================

export const SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
    fontFamily: "'SF Pro Display', 'Inter', system-ui, sans-serif",
    fontSizePx: 24,
    lineHeight: 1.5,
    theme: 'glass',
    backgroundOpacity: 0.75,
    focusBand: true,
    mirrorMode: false,
    showNextLine: true,
    nextLineOpacity: 0.5,
    defaultSpeedWpm: 150,
    beatRewindLines: 2,
    clickThroughDefault: false,
    meetingModeAutoEnable: true,
    meetingModeDomains: ['meet.google.com', 'zoom.us', 'teams.microsoft.com'],
    shortcuts: {
        toggle_play: 'Alt+P',
        toggle_hide: 'Alt+H',
        speed_up: 'Alt+Up',
        speed_down: 'Alt+Down',
        rewind: 'Alt+Left',
        forward: 'Alt+Right',
    },
};

export const DEFAULT_NOTCH_LAYOUT: LayoutProfile = {
    profileId: 'default-notch',
    name: 'Notch Mode',
    mode: 'notch',
    anchor: 'top-center',
    offsetX: 0,
    offsetY: 12,
    width: 600,
    height: 100,
    clickThrough: false,
    compactLines: 2,
};

export const DEFAULT_OVERLAY_LAYOUT: LayoutProfile = {
    profileId: 'default-overlay',
    name: 'Overlay Mode',
    mode: 'overlay',
    anchor: 'top-center',
    offsetX: 0,
    offsetY: 100,
    width: 700,
    height: 200,
    clickThrough: false,
    compactLines: 3,
};
