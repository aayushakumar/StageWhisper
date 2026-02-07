import React, { useState, useEffect } from 'react';
import { Settings, ThemeName } from '@shared/types';
import { getSettings, saveSettings } from '@shared/storage';
import { tokens } from '@shared/designTokens';
import { PLAYBACK, TYPOGRAPHY } from '@shared/constants';

interface SettingsPageProps {
    onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        const loaded = await getSettings();
        setSettings(loaded);
    }

    async function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
        if (!settings) return;

        const updated = { ...settings, [key]: value };
        setSettings(updated);

        setSaving(true);
        await saveSettings({ [key]: value });
        setTimeout(() => setSaving(false), 300);
    }

    if (!settings) {
        return (
            <div className="settings loading">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="settings">
            <header className="settings-header">
                <button className="btn-icon" onClick={onBack} aria-label="Go back">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>
                <h1>Settings</h1>
                {saving && <span className="save-badge">Saved</span>}
            </header>

            <div className="settings-content">
                {/* Theme Section */}
                <section className="settings-section">
                    <h2>Appearance</h2>

                    <div className="setting-row">
                        <label>Theme</label>
                        <div className="theme-picker">
                            {(['glass', 'dark', 'light'] as ThemeName[]).map((theme) => (
                                <button
                                    key={theme}
                                    className={`theme-option ${settings.theme === theme ? 'active' : ''}`}
                                    onClick={() => updateSetting('theme', theme)}
                                    style={{
                                        background: tokens.themes[theme].background,
                                        color: tokens.themes[theme].text,
                                        border: `2px solid ${settings.theme === theme ? tokens.themes[theme].accent : 'transparent'}`,
                                    }}
                                >
                                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="setting-row">
                        <label>Background Opacity</label>
                        <input
                            type="range"
                            min="0.3"
                            max="1"
                            step="0.05"
                            value={settings.backgroundOpacity}
                            onChange={(e) => updateSetting('backgroundOpacity', parseFloat(e.target.value))}
                        />
                        <span className="range-value">{Math.round(settings.backgroundOpacity * 100)}%</span>
                    </div>
                </section>

                {/* Typography Section */}
                <section className="settings-section">
                    <h2>Typography</h2>

                    <div className="setting-row">
                        <label>Font Size</label>
                        <div className="stepper">
                            <button
                                onClick={() => updateSetting('fontSizePx', Math.max(TYPOGRAPHY.MIN_FONT_SIZE_PX, settings.fontSizePx - 2))}
                                disabled={settings.fontSizePx <= TYPOGRAPHY.MIN_FONT_SIZE_PX}
                            >
                                −
                            </button>
                            <span>{settings.fontSizePx}px</span>
                            <button
                                onClick={() => updateSetting('fontSizePx', Math.min(TYPOGRAPHY.MAX_FONT_SIZE_PX, settings.fontSizePx + 2))}
                                disabled={settings.fontSizePx >= TYPOGRAPHY.MAX_FONT_SIZE_PX}
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="setting-row">
                        <label>Line Height</label>
                        <select
                            value={settings.lineHeight}
                            onChange={(e) => updateSetting('lineHeight', parseFloat(e.target.value))}
                        >
                            <option value="1.2">Tight (1.2)</option>
                            <option value="1.5">Normal (1.5)</option>
                            <option value="1.8">Relaxed (1.8)</option>
                        </select>
                    </div>

                    <div className="setting-row">
                        <label>Font Family</label>
                        <select
                            value={settings.fontFamily}
                            onChange={(e) => updateSetting('fontFamily', e.target.value)}
                        >
                            <option value="'SF Pro Display', 'Inter', system-ui, sans-serif">System (SF Pro)</option>
                            <option value="'Inter', system-ui, sans-serif">Inter</option>
                            <option value="'Georgia', serif">Georgia</option>
                            <option value="'Arial', sans-serif">Arial</option>
                        </select>
                    </div>
                </section>

                {/* Playback Section */}
                <section className="settings-section">
                    <h2>Playback</h2>

                    <div className="setting-row">
                        <label>Default Speed</label>
                        <div className="stepper">
                            <button
                                onClick={() => updateSetting('defaultSpeedWpm', Math.max(PLAYBACK.MIN_SPEED_WPM, settings.defaultSpeedWpm - 10))}
                                disabled={settings.defaultSpeedWpm <= PLAYBACK.MIN_SPEED_WPM}
                            >
                                −
                            </button>
                            <span>{settings.defaultSpeedWpm} WPM</span>
                            <button
                                onClick={() => updateSetting('defaultSpeedWpm', Math.min(PLAYBACK.MAX_SPEED_WPM, settings.defaultSpeedWpm + 10))}
                                disabled={settings.defaultSpeedWpm >= PLAYBACK.MAX_SPEED_WPM}
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="setting-row">
                        <label>Beat Rewind</label>
                        <select
                            value={settings.beatRewindLines}
                            onChange={(e) => updateSetting('beatRewindLines', parseInt(e.target.value))}
                        >
                            <option value="1">1 line</option>
                            <option value="2">2 lines</option>
                            <option value="3">3 lines</option>
                        </select>
                    </div>
                </section>

                {/* Reading Aids Section */}
                <section className="settings-section">
                    <h2>Reading Aids</h2>

                    <div className="setting-row toggle-row">
                        <label>Focus Band</label>
                        <button
                            className={`toggle ${settings.focusBand ? 'on' : ''}`}
                            onClick={() => updateSetting('focusBand', !settings.focusBand)}
                            aria-pressed={settings.focusBand}
                        >
                            <span className="toggle-thumb" />
                        </button>
                    </div>

                    <div className="setting-row toggle-row">
                        <label>Show Next Line</label>
                        <button
                            className={`toggle ${settings.showNextLine ? 'on' : ''}`}
                            onClick={() => updateSetting('showNextLine', !settings.showNextLine)}
                            aria-pressed={settings.showNextLine}
                        >
                            <span className="toggle-thumb" />
                        </button>
                    </div>

                    <div className="setting-row toggle-row">
                        <label>Mirror Mode</label>
                        <button
                            className={`toggle ${settings.mirrorMode ? 'on' : ''}`}
                            onClick={() => updateSetting('mirrorMode', !settings.mirrorMode)}
                            aria-pressed={settings.mirrorMode}
                        >
                            <span className="toggle-thumb" />
                        </button>
                    </div>
                </section>

                {/* Meeting Mode Section */}
                <section className="settings-section">
                    <h2>Meeting Mode</h2>

                    <div className="setting-row toggle-row">
                        <label>Auto Click-Through</label>
                        <button
                            className={`toggle ${settings.meetingModeAutoEnable ? 'on' : ''}`}
                            onClick={() => updateSetting('meetingModeAutoEnable', !settings.meetingModeAutoEnable)}
                            aria-pressed={settings.meetingModeAutoEnable}
                        >
                            <span className="toggle-thumb" />
                        </button>
                    </div>
                    <p className="setting-hint">
                        Automatically enables click-through on meeting sites (Google Meet, Zoom, Teams)
                    </p>
                </section>

                {/* Shortcuts Info */}
                <section className="settings-section">
                    <h2>Keyboard Shortcuts</h2>
                    <div className="shortcuts-list">
                        <div className="shortcut">
                            <kbd>Alt+P</kbd>
                            <span>Play / Pause</span>
                        </div>
                        <div className="shortcut">
                            <kbd>Alt+H</kbd>
                            <span>Panic Hide</span>
                        </div>
                        <div className="shortcut">
                            <kbd>Alt+↑/↓</kbd>
                            <span>Speed Up / Down</span>
                        </div>
                        <div className="shortcut">
                            <kbd>Alt+←/→</kbd>
                            <span>Rewind / Forward</span>
                        </div>
                    </div>
                    <button
                        className="btn-secondary"
                        onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}
                    >
                        Customize Shortcuts
                    </button>
                </section>
            </div>
        </div>
    );
}
