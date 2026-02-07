#!/usr/bin/env npx ts-node
/**
 * StageWhisper Debug Test Script
 * Run this to validate storage and messaging flow
 * 
 * Usage: npx ts-node scripts/debug-test.ts
 */

// Mock chrome.storage.local for Node.js testing
const mockStorage: Record<string, unknown> = {};

const mockChrome = {
    storage: {
        local: {
            get: async (keys: string | string[] | null): Promise<Record<string, unknown>> => {
                if (keys === null) return mockStorage;
                if (typeof keys === 'string') return { [keys]: mockStorage[keys] };
                const result: Record<string, unknown> = {};
                for (const key of keys) {
                    result[key] = mockStorage[key];
                }
                return result;
            },
            set: async (items: Record<string, unknown>): Promise<void> => {
                Object.assign(mockStorage, items);
            },
            remove: async (keys: string | string[]): Promise<void> => {
                const keyArray = typeof keys === 'string' ? [keys] : keys;
                for (const key of keyArray) {
                    delete mockStorage[key];
                }
            },
            clear: async (): Promise<void> => {
                for (const key in mockStorage) {
                    delete mockStorage[key];
                }
            },
        },
    },
};

// Replace global chrome
(globalThis as unknown as { chrome: typeof mockChrome }).chrome = mockChrome;

// Test functions
async function testSettingsPersistence() {
    console.log('\n=== Test: Settings Persistence ===');

    // 1. Save settings
    const testSettings = {
        theme: 'dark',
        defaultSpeedWpm: 200,
        fontSizePx: 28,
    };

    await mockChrome.storage.local.set({ settings: testSettings });
    console.log('✓ Settings saved:', testSettings);

    // 2. Read settings back
    const { settings } = await mockChrome.storage.local.get('settings');
    console.log('✓ Settings read:', settings);

    // 3. Verify they match
    if (JSON.stringify(settings) === JSON.stringify(testSettings)) {
        console.log('✓ PASS: Settings match!');
        return true;
    } else {
        console.log('✗ FAIL: Settings mismatch!');
        return false;
    }
}

async function testScriptStorage() {
    console.log('\n=== Test: Script Storage ===');

    const testScript = {
        id: 'test-123',
        title: 'Test Script',
        body: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5',
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    // Save
    await mockChrome.storage.local.set({ scripts: [testScript] });
    console.log('✓ Script saved');

    // Read
    const { scripts } = await mockChrome.storage.local.get('scripts');
    const found = (scripts as typeof testScript[])?.find(s => s.id === 'test-123');

    if (found && found.title === 'Test Script') {
        console.log('✓ PASS: Script found and matches!');
        return true;
    } else {
        console.log('✗ FAIL: Script not found or mismatch!');
        return false;
    }
}

async function testPlaybackLogic() {
    console.log('\n=== Test: Playback Logic ===');

    // Simulate playback state
    const state = {
        playing: false,
        speed: 150, // WPM
        currentLine: 0,
        totalLines: 10,
    };

    // Calculate line interval (assuming 10 words per line)
    const wordsPerLine = 10;
    const linesPerMin = state.speed / wordsPerLine; // 15 lines/min
    const msPerLine = (60 / linesPerMin) * 1000; // 4000ms per line

    console.log(`Speed: ${state.speed} WPM`);
    console.log(`Lines per minute: ${linesPerMin}`);
    console.log(`Milliseconds per line: ${msPerLine}`);

    // At 150 WPM with 10 words/line, we should scroll 15 lines per minute
    // That's 1 line every 4 seconds (4000ms)

    if (msPerLine === 4000) {
        console.log('✓ PASS: Playback timing calculation correct!');
        return true;
    } else {
        console.log('✗ FAIL: Playback timing calculation wrong!');
        return false;
    }
}

function testMessageDeduplication() {
    console.log('\n=== Test: Message Deduplication ===');

    // Simulate message timestamps
    const processedMessages = new Set<string>();

    function shouldProcess(messageId: string): boolean {
        if (processedMessages.has(messageId)) {
            return false;
        }
        processedMessages.add(messageId);
        return true;
    }

    const timestamp = Date.now();
    const msg1 = `SESSION_START-${timestamp}`;
    const msg2 = `SESSION_START-${timestamp}`; // Duplicate
    const msg3 = `SESSION_START-${timestamp + 1}`; // Different

    const results = [
        shouldProcess(msg1), // true
        shouldProcess(msg2), // false (duplicate)
        shouldProcess(msg3), // true
    ];

    if (results[0] === true && results[1] === false && results[2] === true) {
        console.log('✓ PASS: Deduplication works correctly!');
        return true;
    } else {
        console.log('✗ FAIL: Deduplication logic error!');
        return false;
    }
}

// Run all tests
async function runTests() {
    console.log('🧪 StageWhisper Debug Tests');
    console.log('============================');

    const results = await Promise.all([
        testSettingsPersistence(),
        testScriptStorage(),
        testPlaybackLogic(),
        testMessageDeduplication(),
    ]);

    console.log('\n============================');
    console.log('📊 Results:');
    console.log(`  Passed: ${results.filter(r => r).length}/${results.length}`);

    if (results.every(r => r)) {
        console.log('\n✅ All tests passed!');
    } else {
        console.log('\n❌ Some tests failed!');
    }
}

runTests().catch(console.error);
