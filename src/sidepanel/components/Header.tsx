import React from 'react';

interface HeaderProps {
    title: string;
    showBack?: boolean;
    onBack?: () => void;
    onSettings?: () => void;
    onStartOverlay?: () => void;
}

export function Header({ title, showBack, onBack, onSettings, onStartOverlay }: HeaderProps) {
    return (
        <header className="header">
            <div className="header-left">
                {showBack && (
                    <button className="btn-icon" onClick={onBack} aria-label="Go back">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                )}
                <h1 className="header-title">{title}</h1>
            </div>

            <div className="header-right">
                {onStartOverlay && (
                    <button className="btn-primary" onClick={onStartOverlay}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                        Start
                    </button>
                )}
                {onSettings && (
                    <button className="btn-icon" onClick={onSettings} aria-label="Settings">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                        </svg>
                    </button>
                )}
            </div>
        </header>
    );
}
