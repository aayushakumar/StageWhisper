// ============================================================================
// StageWhisper - Context Menu Setup
// Right-click "Send to StageWhisper" functionality
// ============================================================================

import { CONTEXT_MENU_IDS } from '@shared/constants';
import { saveScript, generateId } from '@shared/storage';
import { Script } from '@shared/types';

export async function setupContextMenus(): Promise<void> {
    // Remove existing menu items first (in case of update)
    await chrome.contextMenus.removeAll();

    // Create "Send to StageWhisper" menu item
    chrome.contextMenus.create({
        id: CONTEXT_MENU_IDS.SEND_TO_TELEPROMPTER,
        title: 'Send to StageWhisper',
        contexts: ['selection'],
    });

    // Handle menu clicks
    chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
}

async function handleContextMenuClick(
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
): Promise<void> {
    if (info.menuItemId !== CONTEXT_MENU_IDS.SEND_TO_TELEPROMPTER) {
        return;
    }

    const selectedText = info.selectionText?.trim();

    if (!selectedText) {
        console.log('[StageWhisper] No text selected');
        return;
    }

    // Create a new script from the selection
    const script: Script = {
        id: generateId(),
        title: generateTitleFromText(selectedText, tab?.title),
        body: selectedText,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: ['captured'],
    };

    await saveScript(script);

    console.log('[StageWhisper] Created script from selection:', script.id);

    // Open side panel to show the new script
    if (tab?.windowId) {
        try {
            await chrome.sidePanel.open({ windowId: tab.windowId });
        } catch (error) {
            console.error('[StageWhisper] Could not open side panel:', error);
        }
    }
}

/**
 * Generate a title from the selected text or page title
 */
function generateTitleFromText(text: string, pageTitle?: string): string {
    // Use first line or first N characters
    const firstLine = text.split('\n')[0] ?? '';
    const preview = firstLine.slice(0, 50).trim();

    if (preview.length > 0) {
        return preview + (firstLine.length > 50 ? '...' : '');
    }

    if (pageTitle) {
        return `From: ${pageTitle.slice(0, 40)}`;
    }

    return `Captured ${new Date().toLocaleDateString()}`;
}
