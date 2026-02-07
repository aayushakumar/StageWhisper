// ============================================================================
// StageWhisper - Keyboard Command Handlers
// Global hotkey handling via chrome.commands API
// ============================================================================

import { SessionRouter } from './sessionRouter';
import { Command } from '@shared/types';

// Map chrome.commands to our Command types
const COMMAND_MAP: Record<string, Command> = {
    toggle_play: 'toggle_play',
    toggle_hide: 'toggle_hide',
    speed_up: 'speed_up',
    speed_down: 'speed_down',
    rewind: 'rewind',
    forward: 'forward',
};

export function setupCommands(router: SessionRouter): void {
    chrome.commands.onCommand.addListener(async (commandName) => {
        console.log('[StageWhisper] Command received:', commandName);

        const command = COMMAND_MAP[commandName];

        if (command) {
            await router.routeCommand(command);
        }
    });
}
