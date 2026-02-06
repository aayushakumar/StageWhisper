import {
    Message,
    MessageType,
    Command,
    Session,
    PlaybackState,
    Script,
    SessionStartMessage,
    SessionEndMessage,
    StateUpdateMessage,
    CommandMessage,
    ScriptUpdateMessage,
    PanicHideMessage,
    InjectOverlayMessage,
} from './types';

// ============================================================================
// Message Factories
// ============================================================================

export const Messages = {
    sessionStart: (session: Session): SessionStartMessage => ({
        type: 'SESSION_START',
        session,
        timestamp: Date.now(),
    }),

    sessionEnd: (sessionId: string): SessionEndMessage => ({
        type: 'SESSION_END',
        sessionId,
        timestamp: Date.now(),
    }),

    stateUpdate: (sessionId: string, playbackState: Partial<PlaybackState>): StateUpdateMessage => ({
        type: 'STATE_UPDATE',
        sessionId,
        playbackState,
        timestamp: Date.now(),
    }),

    command: (command: Command, payload?: { seekPosition?: number; speed?: number }): CommandMessage => ({
        type: 'COMMAND',
        command,
        payload,
        timestamp: Date.now(),
    }),

    scriptUpdate: (script: Script): ScriptUpdateMessage => ({
        type: 'SCRIPT_UPDATE',
        script,
        timestamp: Date.now(),
    }),

    panicHide: (hidden: boolean): PanicHideMessage => ({
        type: 'PANIC_HIDE',
        hidden,
        timestamp: Date.now(),
    }),

    injectOverlay: (tabId: number, scriptId: string): InjectOverlayMessage => ({
        type: 'INJECT_OVERLAY',
        tabId,
        scriptId,
        timestamp: Date.now(),
    }),
};

// ============================================================================
// Message Validation
// ============================================================================

const MESSAGE_TYPES: Set<MessageType> = new Set([
    'SESSION_START',
    'SESSION_END',
    'STATE_UPDATE',
    'COMMAND',
    'SCRIPT_UPDATE',
    'PANIC_HIDE',
    'INJECT_OVERLAY',
]);

export function isValidMessage(msg: unknown): msg is Message {
    if (!msg || typeof msg !== 'object') return false;

    const { type, timestamp } = msg as Partial<Message>;

    return (
        typeof type === 'string' &&
        MESSAGE_TYPES.has(type as MessageType) &&
        typeof timestamp === 'number'
    );
}

export function validateSender(sender: chrome.runtime.MessageSender): boolean {
    // Only accept messages from our own extension
    return sender.id === chrome.runtime.id;
}

// ============================================================================
// Send Messages
// ============================================================================

/**
 * Send a message to the background service worker
 */
export async function sendToBackground<T = void>(message: Message): Promise<T> {
    return chrome.runtime.sendMessage(message);
}

/**
 * Send a message to a specific tab's content script
 */
export async function sendToTab<T = void>(tabId: number, message: Message): Promise<T> {
    return chrome.tabs.sendMessage(tabId, message);
}

/**
 * Send a message to all tabs with content scripts
 */
export async function broadcastToTabs(message: Message): Promise<void> {
    const tabs = await chrome.tabs.query({});

    await Promise.allSettled(
        tabs.map((tab) => {
            if (tab.id) {
                return chrome.tabs.sendMessage(tab.id, message).catch(() => {
                    // Ignore errors for tabs without content scripts
                });
            }
            return Promise.resolve();
        })
    );
}

// ============================================================================
// Message Listeners
// ============================================================================

// Type-safe handler for each specific message type
type MessageHandlerFor<T extends MessageType> =
    T extends 'SESSION_START' ? (msg: SessionStartMessage, sender: chrome.runtime.MessageSender) => Promise<unknown> | void :
    T extends 'SESSION_END' ? (msg: SessionEndMessage, sender: chrome.runtime.MessageSender) => Promise<unknown> | void :
    T extends 'STATE_UPDATE' ? (msg: StateUpdateMessage, sender: chrome.runtime.MessageSender) => Promise<unknown> | void :
    T extends 'COMMAND' ? (msg: CommandMessage, sender: chrome.runtime.MessageSender) => Promise<unknown> | void :
    T extends 'SCRIPT_UPDATE' ? (msg: ScriptUpdateMessage, sender: chrome.runtime.MessageSender) => Promise<unknown> | void :
    T extends 'PANIC_HIDE' ? (msg: PanicHideMessage, sender: chrome.runtime.MessageSender) => Promise<unknown> | void :
    T extends 'INJECT_OVERLAY' ? (msg: InjectOverlayMessage, sender: chrome.runtime.MessageSender) => Promise<unknown> | void :
    never;

// Handler map with proper types
type MessageHandlerMap = {
    [K in MessageType]?: MessageHandlerFor<K>;
};

/**
 * Create a message listener with typed handlers
 */
export function createMessageListener(handlers: MessageHandlerMap) {
    return (
        message: unknown,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: unknown) => void
    ): boolean => {
        // Validate message and sender
        if (!isValidMessage(message) || !validateSender(sender)) {
            return false;
        }

        const handler = handlers[message.type] as ((msg: Message, sender: chrome.runtime.MessageSender) => Promise<unknown> | void) | undefined;
        if (!handler) {
            return false;
        }

        // Handle async responses
        const result = handler(message, sender);

        if (result instanceof Promise) {
            result
                .then(sendResponse)
                .catch((error: Error) => {
                    console.error(`[StageWhisper] Message handler error:`, error);
                    sendResponse({ error: error.message });
                });
            return true; // Keep channel open for async response
        }

        return false;
    };
}

// ============================================================================
// Port-based Communication (for real-time sync)
// ============================================================================

export interface PortConnection {
    port: chrome.runtime.Port;
    send: (message: Message) => void;
    disconnect: () => void;
}

/**
 * Connect to the background service worker via port
 */
export function connectToBackground(
    name: string,
    onMessage: (message: Message) => void,
    onDisconnect?: () => void
): PortConnection {
    const port = chrome.runtime.connect({ name });

    port.onMessage.addListener((msg) => {
        if (isValidMessage(msg)) {
            onMessage(msg);
        }
    });

    if (onDisconnect) {
        port.onDisconnect.addListener(onDisconnect);
    }

    return {
        port,
        send: (message) => port.postMessage(message),
        disconnect: () => port.disconnect(),
    };
}

/**
 * Listen for port connections (in service worker)
 */
export function onPortConnect(
    name: string,
    handler: (port: chrome.runtime.Port) => void
): void {
    chrome.runtime.onConnect.addListener((port) => {
        if (port.name === name) {
            handler(port);
        }
    });
}
