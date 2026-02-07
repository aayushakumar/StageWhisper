import React from 'react';
import { Script } from '@shared/types';

interface ScriptListProps {
    scripts: Script[];
    onSelect: (script: Script) => void;
    onCreate: () => void;
    onDelete: (id: string) => void;
}

export function ScriptList({ scripts, onSelect, onCreate, onDelete }: ScriptListProps) {
    function formatDate(timestamp: number): string {
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        return date.toLocaleDateString();
    }

    function getPreview(body: string): string {
        const cleaned = body.replace(/[#*_`]/g, '').trim();
        if (cleaned.length <= 60) return cleaned || 'Empty script';
        return cleaned.slice(0, 60) + '...';
    }

    return (
        <div className="script-list">
            <button className="btn-create" onClick={onCreate}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                </svg>
                New Script
            </button>

            {scripts.length === 0 ? (
                <div className="empty-state">
                    <p>No scripts yet</p>
                    <p className="muted">Create your first script to get started</p>
                </div>
            ) : (
                <ul className="scripts">
                    {scripts.map((script) => (
                        <li key={script.id} className="script-item">
                            <button className="script-card" onClick={() => onSelect(script)}>
                                <div className="script-header">
                                    <span className="script-title">{script.title}</span>
                                    <span className="script-date">{formatDate(script.updatedAt)}</span>
                                </div>
                                <p className="script-preview">{getPreview(script.body)}</p>
                            </button>

                            <button
                                className="btn-delete"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(script.id);
                                }}
                                aria-label={`Delete ${script.title}`}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                </svg>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
