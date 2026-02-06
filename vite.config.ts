import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import manifest from './manifest.json';

export default defineConfig({
    plugins: [
        react(),
        crx({ manifest }),
    ],
    resolve: {
        alias: {
            '@shared': resolve(__dirname, 'src/shared'),
            '@background': resolve(__dirname, 'src/background'),
            '@sidepanel': resolve(__dirname, 'src/sidepanel'),
            '@content': resolve(__dirname, 'src/content'),
            '@pip': resolve(__dirname, 'src/pip'),
        },
    },
    build: {
        rollupOptions: {
            input: {
                sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
                inject: resolve(__dirname, 'src/content/inject.ts'),
            },
            output: {
                // Use predictable names for content scripts (no hash)
                entryFileNames: (chunkInfo) => {
                    if (chunkInfo.name === 'inject') {
                        return 'content/inject.js';
                    }
                    return 'assets/[name]-[hash].js';
                },
                // Bundle content script as IIFE so it works when injected
                format: 'es',
                // Inline all chunks for content script
                inlineDynamicImports: false,
                manualChunks: (id) => {
                    // Don't split content script - inline everything
                    if (id.includes('inject.ts') || id.includes('designTokens')) {
                        return undefined;
                    }
                },
            },
        },
        outDir: 'dist',
        sourcemap: process.env.NODE_ENV === 'development',
    },
});

