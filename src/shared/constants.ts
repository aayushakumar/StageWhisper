// ============================================================================
// StageWhisper - Constants
// Shared constants across all extension contexts
// ============================================================================

// Extension identification
export const EXTENSION_NAME = 'StageWhisper';
export const EXTENSION_VERSION = '0.1.0';

// Port names for messaging
export const PORT_NAMES = {
    SESSION_SYNC: 'stagewhisper-session-sync',
    OVERLAY_CONTROL: 'stagewhisper-overlay-control',
} as const;

// Context menu IDs
export const CONTEXT_MENU_IDS = {
    SEND_TO_TELEPROMPTER: 'send-to-stagewhisper',
} as const;

// Playback defaults
export const PLAYBACK = {
    MIN_SPEED_WPM: 50,
    MAX_SPEED_WPM: 400,
    DEFAULT_SPEED_WPM: 150,
    SPEED_STEP_WPM: 10,
    BEAT_REWIND_LINES: 2,
    FORWARD_LINES: 2,
} as const;

// Layout constraints
export const LAYOUT = {
    MIN_WIDTH: 300,
    MAX_WIDTH: 1200,
    MIN_HEIGHT: 60,
    MAX_HEIGHT: 400,
    SNAP_THRESHOLD_PX: 24,
    DEFAULT_OFFSET_Y: 12,
} as const;

// Typography
export const TYPOGRAPHY = {
    MIN_FONT_SIZE_PX: 14,
    MAX_FONT_SIZE_PX: 64,
    DEFAULT_FONT_SIZE_PX: 24,
    FONT_SIZE_STEP_PX: 2,
} as const;

// Animation timings (ms)
export const ANIMATION = {
    SCROLL_FRAME_BUDGET_MS: 16, // 60fps target
    HIDE_TRANSITION_MS: 200,
    TOAST_DURATION_MS: 3000,
} as const;

// Meeting domains for auto click-through
export const MEETING_DOMAINS = [
    'meet.google.com',
    'zoom.us',
    'teams.microsoft.com',
    'whereby.com',
    'webex.com',
    'bluejeans.com',
] as const;

// Restricted pages where we cannot inject
export const RESTRICTED_URL_PATTERNS = [
    /^chrome:\/\//,
    /^chrome-extension:\/\//,
    /^edge:\/\//,
    /^about:/,
    /^file:\/\//,
    /^https:\/\/chrome\.google\.com\/webstore/,
    /^https:\/\/addons\.mozilla\.org/,
    /^https:\/\/microsoftedge\.microsoft\.com/,
] as const;

/**
 * Check if a URL is restricted (cannot inject content scripts)
 */
export function isRestrictedUrl(url: string): boolean {
    return RESTRICTED_URL_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * Check if a URL is a known meeting domain
 */
export function isMeetingDomain(url: string): boolean {
    try {
        const { hostname } = new URL(url);
        return MEETING_DOMAINS.some(
            (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
        );
    } catch {
        return false;
    }
}

/**
 * Extract eTLD+1 from URL for site layouts
 */
export function getHostFromUrl(url: string): string {
    try {
        const { hostname } = new URL(url);
        // Simple eTLD+1 extraction (could use psl library for accuracy)
        const parts = hostname.split('.');
        if (parts.length > 2) {
            return parts.slice(-2).join('.');
        }
        return hostname;
    } catch {
        return '';
    }
}
