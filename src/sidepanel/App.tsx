import React, { useState, useEffect, useRef } from 'react';
import { ScriptList } from './components/ScriptList';
import { Editor } from './components/Editor';
import { Header } from './components/Header';
import { SettingsPage } from './components/SettingsPage';
import { Script } from '@shared/types';
import { getScripts, saveScript, deleteScript, generateId, getLastSession } from '@shared/storage';

type View = 'list' | 'editor' | 'settings';

export function App() {
    const [view, setView] = useState<View>('list');
    const [scripts, setScripts] = useState<Script[]>([]);
    const [activeScript, setActiveScript] = useState<Script | null>(null);
    const [loading, setLoading] = useState(true);
    const [resumeInfo, setResumeInfo] = useState<{ scriptId: string; line: number } | null>(null);
    const [isInjecting, setIsInjecting] = useState(false);

    // Load scripts on mount
    useEffect(() => {
        loadScripts();
        checkResumeSession();
    }, []);

    async function loadScripts() {
        try {
            const loaded = await getScripts();
            setScripts(loaded);
        } catch (error) {
            console.error('[StageWhisper] Failed to load scripts:', error);
        } finally {
            setLoading(false);
        }
    }

    async function checkResumeSession() {
        try {
            const lastSession = await getLastSession();
            if (lastSession && Date.now() - lastSession.savedAt < 24 * 60 * 60 * 1000) {
                setResumeInfo({ scriptId: lastSession.scriptId, line: lastSession.line });
            }
        } catch (error) {
            console.error('[StageWhisper] Failed to check resume session:', error);
        }
    }

    async function handleCreateScript() {
        const script: Script = {
            id: generateId(),
            title: 'Untitled Script',
            body: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            tags: [],
        };

        await saveScript(script);
        setScripts((prev) => [script, ...prev]);
        setActiveScript(script);
        setView('editor');
    }

    async function handleSelectScript(script: Script) {
        setActiveScript(script);
        setView('editor');
    }

    async function handleSaveScript(script: Script) {
        await saveScript(script);
        setScripts((prev) => prev.map((s) => (s.id === script.id ? script : s)));
        setActiveScript(script);
    }

    async function handleDeleteScript(id: string) {
        await deleteScript(id);
        setScripts((prev) => prev.filter((s) => s.id !== id));

        if (activeScript?.id === id) {
            setActiveScript(null);
            setView('list');
        }
    }

    function handleBack() {
        if (view === 'settings') {
            setView(activeScript ? 'editor' : 'list');
        } else {
            setView('list');
        }
    }

    function handleOpenSettings() {
        setView('settings');
    }

    async function handleStartOverlay(resumeFromLine?: number) {
        if (!activeScript || isInjecting) return;

        setIsInjecting(true);

        try {
            // Get current tab and inject overlay
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (tab?.id) {
                await chrome.runtime.sendMessage({
                    type: 'INJECT_OVERLAY',
                    tabId: tab.id,
                    scriptId: activeScript.id,
                    startLine: resumeFromLine,
                    timestamp: Date.now(),
                });
            }
        } finally {
            // Debounce - prevent rapid clicks
            setTimeout(() => setIsInjecting(false), 1000);
        }
    }

    async function handleResumeLastSession() {
        if (!resumeInfo) return;

        const script = scripts.find((s) => s.id === resumeInfo.scriptId);
        if (script) {
            setActiveScript(script);
            setView('editor');
            // Could auto-start from saved line here
        }
    }

    if (loading) {
        return (
            <div className="app loading">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="app">
            {view !== 'settings' && (
                <Header
                    title={view === 'editor' && activeScript ? activeScript.title : 'StageWhisper'}
                    showBack={view === 'editor'}
                    onBack={handleBack}
                    onSettings={handleOpenSettings}
                    onStartOverlay={view === 'editor' ? () => handleStartOverlay() : undefined}
                />
            )}

            <main className="main-content">
                {view === 'list' && (
                    <>
                        {resumeInfo && (
                            <button className="btn-resume" onClick={handleResumeLastSession}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 12a9 9 0 109-9 9 9 0 00-9 9z" />
                                    <path d="M12 8v4l3 3" />
                                </svg>
                                Resume last session
                            </button>
                        )}
                        <ScriptList
                            scripts={scripts}
                            onSelect={handleSelectScript}
                            onCreate={handleCreateScript}
                            onDelete={handleDeleteScript}
                        />
                    </>
                )}

                {view === 'editor' && activeScript && (
                    <Editor script={activeScript} onSave={handleSaveScript} />
                )}

                {view === 'settings' && <SettingsPage onBack={handleBack} />}
            </main>
        </div>
    );
}
