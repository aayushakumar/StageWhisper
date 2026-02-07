import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Script } from '@shared/types';

interface EditorProps {
    script: Script;
    onSave: (script: Script) => void;
}

export function Editor({ script, onSave }: EditorProps) {
    const [title, setTitle] = useState(script.title);
    const [body, setBody] = useState(script.body);
    const [saving, setSaving] = useState(false);
    const saveTimeoutRef = useRef<number | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Reset state when script changes
    useEffect(() => {
        setTitle(script.title);
        setBody(script.body);
    }, [script.id]);

    // Auto-save with debounce
    const debouncedSave = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = window.setTimeout(() => {
            setSaving(true);
            onSave({
                ...script,
                title,
                body,
                updatedAt: Date.now(),
            });

            // Brief visual feedback
            setTimeout(() => setSaving(false), 500);
        }, 800);
    }, [script, title, body, onSave]);

    useEffect(() => {
        debouncedSave();

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [title, body, debouncedSave]);

    // Calculate word count and estimated reading time
    const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(wordCount / 150); // 150 WPM default

    return (
        <div className="editor">
            <div className="editor-header">
                <input
                    type="text"
                    className="title-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Script title..."
                />
                <div className="editor-meta">
                    <span className="word-count">{wordCount} words</span>
                    <span className="reading-time">~{readingTime} min</span>
                    {saving && <span className="save-indicator">Saving...</span>}
                </div>
            </div>

            <textarea
                ref={textareaRef}
                className="body-textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Start writing your script...

Tips:
• Use **bold** for emphasis
• Use # for section headers
• Press Alt+P to play/pause during prompting"
            />
        </div>
    );
}
