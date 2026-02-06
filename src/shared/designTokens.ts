// ============================================================================
// StageWhisper - Design Tokens
// Premium, consistent design system across all UI surfaces
// ============================================================================

export const tokens = {
    // Spacing scale (4px base unit)
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },

    // Border radius
    radius: {
        sm: 8,
        md: 12,
        lg: 18,
        full: 9999,
    },

    // Typography
    font: {
        family: {
            display: "'SF Pro Display', 'Inter', system-ui, sans-serif",
            mono: "'SF Mono', 'Fira Code', monospace",
        },
        size: {
            xs: 12,
            sm: 14,
            md: 16,
            lg: 20,
            xl: 24,
            xxl: 32,
            hero: 48,
        },
        weight: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
        },
        lineHeight: {
            tight: 1.2,
            normal: 1.5,
            relaxed: 1.8,
        },
    },

    // Theme configurations
    themes: {
        glass: {
            background: 'rgba(30, 30, 30, 0.75)',
            backgroundSolid: '#1e1e1e',
            surface: 'rgba(255, 255, 255, 0.05)',
            surfaceHover: 'rgba(255, 255, 255, 0.1)',
            border: 'rgba(255, 255, 255, 0.1)',
            text: '#ffffff',
            textMuted: 'rgba(255, 255, 255, 0.6)',
            textDim: 'rgba(255, 255, 255, 0.4)',
            accent: '#007AFF',
            accentHover: '#0066d6',
            success: '#34C759',
            warning: '#FF9500',
            error: '#FF3B30',
            blur: '20px',
        },
        dark: {
            background: '#1a1a1a',
            backgroundSolid: '#1a1a1a',
            surface: '#2d2d2d',
            surfaceHover: '#3d3d3d',
            border: '#404040',
            text: '#e0e0e0',
            textMuted: '#a0a0a0',
            textDim: '#707070',
            accent: '#0A84FF',
            accentHover: '#007AFF',
            success: '#30D158',
            warning: '#FFD60A',
            error: '#FF453A',
            blur: '0',
        },
        light: {
            background: '#ffffff',
            backgroundSolid: '#ffffff',
            surface: '#f5f5f5',
            surfaceHover: '#ebebeb',
            border: '#e0e0e0',
            text: '#1a1a1a',
            textMuted: '#666666',
            textDim: '#999999',
            accent: '#007AFF',
            accentHover: '#0066d6',
            success: '#34C759',
            warning: '#FF9500',
            error: '#FF3B30',
            blur: '0',
        },
    },

    // Animation
    animation: {
        duration: {
            instant: 50,
            fast: 100,
            normal: 200,
            slow: 400,
            verySlow: 600,
        },
        easing: {
            default: 'cubic-bezier(0.4, 0, 0.2, 1)',
            easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
            easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
            spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        },
    },

    // Shadows
    shadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
        glow: '0 0 20px rgba(0, 122, 255, 0.3)',
    },

    // Z-index layers
    zIndex: {
        base: 0,
        dropdown: 100,
        overlay: 1000,
        modal: 2000,
        toast: 3000,
        tooltip: 4000,
    },

    // Breakpoints (for responsive sidepanel)
    breakpoint: {
        sm: 320,
        md: 400,
        lg: 500,
    },
} as const;

// Type exports for theme access
export type ThemeName = keyof typeof tokens.themes;
export type Theme = (typeof tokens.themes)[ThemeName];

/**
 * Get CSS variables for a theme
 */
export function getThemeCSSVars(themeName: ThemeName): Record<string, string> {
    const theme = tokens.themes[themeName];
    return {
        '--sw-bg': theme.background,
        '--sw-bg-solid': theme.backgroundSolid,
        '--sw-surface': theme.surface,
        '--sw-surface-hover': theme.surfaceHover,
        '--sw-border': theme.border,
        '--sw-text': theme.text,
        '--sw-text-muted': theme.textMuted,
        '--sw-text-dim': theme.textDim,
        '--sw-accent': theme.accent,
        '--sw-accent-hover': theme.accentHover,
        '--sw-success': theme.success,
        '--sw-warning': theme.warning,
        '--sw-error': theme.error,
        '--sw-blur': theme.blur,
    };
}

/**
 * CSS custom properties template for injection
 */
export function getThemeCSS(themeName: ThemeName): string {
    const vars = getThemeCSSVars(themeName);
    return Object.entries(vars)
        .map(([key, value]) => `${key}: ${value};`)
        .join('\n');
}
