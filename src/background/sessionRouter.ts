// ============================================================================
// StageWhisper - Session Router
// Routes commands to the correct playback context
// ============================================================================

import { Session, Command, Message } from '@shared/types';
import { sendToTab, Messages, onPortConnect, createMessageListener } from '@shared/messaging';
import { PORT_NAMES, isRestrictedUrl } from '@shared/constants';
import { generateId, saveLastSession } from '@shared/storage';

interface ActiveSession {
    session: Session;
    port?: chrome.runtime.Port;
}

export class SessionRouter {
    private sessions: Map<string, ActiveSession> = new Map();
    private pipSessionId: string | null = null;
    private globalHidden = false;

    constructor() {
        this.setupListeners();
    }

    // ==========================================================================
    // Setup
    // ==========================================================================

    private setupListeners(): void {
        // Listen for port connections from overlay/PiP
        onPortConnect(PORT_NAMES.SESSION_SYNC, (port) => {
            this.handlePortConnect(port);
        });

        // Listen for one-shot messages
        // Note: INJECT_OVERLAY is handled by sw.ts to avoid duplicate processing
        chrome.runtime.onMessage.addListener(
            createMessageListener({
                SESSION_START: (msg) => this.handleSessionStart(msg.session),
                SESSION_END: (msg) => this.handleSessionEnd(msg.sessionId),
                STATE_UPDATE: (msg) => this.handleStateUpdate(msg.sessionId, msg.playbackState),
            })
        );
    }

    private handlePortConnect(port: chrome.runtime.Port): void {
        port.onMessage.addListener((msg: Message) => {
            if (msg.type === 'SESSION_START') {
                const session = (msg as { session: Session }).session;
                this.sessions.set(session.sessionId, { session, port });

                if (session.mode === 'pip') {
                    this.pipSessionId = session.sessionId;
                }
            }
        });

        port.onDisconnect.addListener(() => {
            // Find and remove the session associated with this port
            for (const [id, entry] of this.sessions.entries()) {
                if (entry.port === port) {
                    this.handleSessionEnd(id);
                    break;
                }
            }
        });
    }

    // ==========================================================================
    // Session Management
    // ==========================================================================

    private handleSessionStart(session: Session): void {
        this.sessions.set(session.sessionId, { session });

        if (session.mode === 'pip') {
            this.pipSessionId = session.sessionId;
        }
    }

    private handleSessionEnd(sessionId: string): void {
        const entry = this.sessions.get(sessionId);

        if (entry) {
            // Save position for resume
            const { session } = entry;
            saveLastSession({
                scriptId: session.scriptId,
                position: session.playbackState.position,
                line: session.playbackState.currentLine,
                savedAt: Date.now(),
            }).catch(console.error);
        }

        this.sessions.delete(sessionId);

        if (this.pipSessionId === sessionId) {
            this.pipSessionId = null;
        }
    }

    private handleStateUpdate(
        sessionId: string,
        playbackState: Partial<Session['playbackState']>
    ): void {
        const entry = this.sessions.get(sessionId);

        if (entry) {
            entry.session.playbackState = {
                ...entry.session.playbackState,
                ...playbackState,
            };
        }
    }

    // ==========================================================================
    // Command Routing
    // ==========================================================================

    /**
     * Route a command to the appropriate playback context
     * Priority: PiP > Active tab overlay > Show toast
     */
    async routeCommand(command: Command): Promise<void> {
        // Handle global panic hide
        if (command === 'toggle_hide') {
            return this.handlePanicHide();
        }

        // Priority 1: PiP session
        if (this.pipSessionId) {
            const entry = this.sessions.get(this.pipSessionId);
            if (entry?.port) {
                entry.port.postMessage(Messages.command(command));
                return;
            }
        }

        // Priority 2: Overlay on active tab
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (activeTab?.id) {
            const overlaySession = this.findOverlaySession(activeTab.id);

            if (overlaySession) {
                try {
                    await sendToTab(activeTab.id, Messages.command(command));
                    return;
                } catch {
                    // Tab might not have content script, fall through
                }
            }
        }

        // No active session - show notification
        await this.showToast('No active teleprompter. Open Side Panel to start.');
    }

    private findOverlaySession(tabId: number): ActiveSession | undefined {
        for (const entry of this.sessions.values()) {
            if (entry.session.mode === 'overlay' && entry.session.tabId === tabId) {
                return entry;
            }
        }
        return undefined;
    }

    // ==========================================================================
    // Panic Hide
    // ==========================================================================

    private async handlePanicHide(): Promise<void> {
        this.globalHidden = !this.globalHidden;

        const message = Messages.panicHide(this.globalHidden);

        // Send to all sessions
        for (const entry of this.sessions.values()) {
            if (entry.port) {
                entry.port.postMessage(message);
            } else if (entry.session.tabId) {
                await sendToTab(entry.session.tabId, message).catch(() => { });
            }
        }
    }

    // ==========================================================================
    // Overlay Injection
    // ==========================================================================

    async injectOverlay(tabId: number, scriptId: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Get tab URL to check if restricted
            const tab = await chrome.tabs.get(tabId);

            if (!tab.url || isRestrictedUrl(tab.url)) {
                return {
                    success: false,
                    error: "Can't display here. Try a regular webpage.",
                };
            }

            // Inject content script
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['content/inject.js'],
            });

            // Small delay to ensure content script initializes
            await new Promise(resolve => setTimeout(resolve, 100));

            // Create session
            const session: Session = {
                sessionId: generateId(),
                tabId,
                mode: 'overlay',
                scriptId,
                playbackState: {
                    playing: false,
                    speed: 150,
                    position: 0,
                    currentLine: 0,
                    totalLines: 0,
                    estimatedTimeRemaining: 0,
                },
                hidden: false,
                createdAt: Date.now(),
            };

            this.handleSessionStart(session);

            // Send session info to content script
            await sendToTab(tabId, Messages.sessionStart(session));

            return { success: true };
        } catch (error) {
            console.error('[StageWhisper] injectOverlay error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    }

    // ==========================================================================
    // Utilities
    // ==========================================================================

    private async showToast(message: string): Promise<void> {
        // In a real implementation, this would show an in-page toast
        // For now, we just log it
        console.log('[StageWhisper] Toast:', message);
    }

    getActiveSessions(): Session[] {
        return Array.from(this.sessions.values()).map((e) => e.session);
    }

    isGlobalHidden(): boolean {
        return this.globalHidden;
    }
}
