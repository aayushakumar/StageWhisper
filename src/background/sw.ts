// ============================================================================
// StageWhisper - Service Worker Entry Point
// Main background script for Chrome MV3
// ============================================================================

import { initializeStorage } from '@shared/storage';
import { setupCommands } from './commands';
import { setupContextMenus } from './contextMenus';
import { SessionRouter } from './sessionRouter';

// Global session router instance
let sessionRouter: SessionRouter;

// ============================================================================
// Initialization
// ============================================================================

chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('[StageWhisper] Extension installed:', details.reason);

    // Initialize storage with defaults/migrations
    await initializeStorage();

    // Setup context menus
    await setupContextMenus();

    // Open side panel on fresh install
    if (details.reason === 'install') {
        // Note: Cannot auto-open side panel, but we can set it as default action
        console.log('[StageWhisper] Fresh install - ready to use');
    }
});

chrome.runtime.onStartup.addListener(async () => {
    console.log('[StageWhisper] Extension starting up');
    await initializeStorage();
    await setupContextMenus();
});

// Initialize session router
sessionRouter = new SessionRouter();

// Setup keyboard command handlers
setupCommands(sessionRouter);

// ============================================================================
// Message Listener for Overlay Injection
// ============================================================================

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    // Handle INJECT_OVERLAY from side panel
    if (message && message.type === 'INJECT_OVERLAY' && message.tabId && message.scriptId) {
        sessionRouter.injectOverlay(message.tabId, message.scriptId)
            .then((result) => {
                if (!result.success) {
                    console.warn('[StageWhisper] Injection failed:', result.error);
                }
                sendResponse(result);
            })
            .catch((error) => {
                console.error('[StageWhisper] Injection error:', error);
                sendResponse({ success: false, error: error.message });
            });

        return true; // Keep channel open for async response
    }

    return false;
});

// ============================================================================
// Side Panel Behavior
// ============================================================================

// Open side panel when clicking extension icon
chrome.action.onClicked.addListener(async (tab) => {
    if (tab.id && tab.windowId) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
    }
});

// Set side panel to open in same window
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('[StageWhisper] Side panel setup error:', error));

// ============================================================================
// Export for module access (if needed by other background scripts)
// ============================================================================

export { sessionRouter };

