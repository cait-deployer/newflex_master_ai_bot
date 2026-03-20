'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';

const STORAGE_KEY = 'ui-theme';

/**
 * useDarkMode — syncs dark mode between:
 * 1. next-themes (applies .dark class to <html>)
 * 2. localStorage (persists preference)
 *
 * Usage in your main page / layout:
 *
 *   const { darkMode, toggleDarkMode } = useDarkMode()
 *
 *   <Sidebar darkMode={darkMode} onToggleDarkMode={toggleDarkMode} ... />
 */
export function useDarkMode() {
    const { setTheme, resolvedTheme } = useTheme();
    const [darkMode, setDarkMode] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Sync local state with resolved theme after mount (avoids hydration mismatch)
    useEffect(() => {
        setMounted(true);
        setDarkMode(resolvedTheme === 'dark');
    }, [resolvedTheme]);

    const toggleDarkMode = useCallback(() => {
        const next = !darkMode;
        setDarkMode(next);
        setTheme(next ? 'dark' : 'light');
        // Belt-and-suspenders: also write directly so it's available immediately
        localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    }, [darkMode, setTheme]);

    return { darkMode: mounted ? darkMode : false, toggleDarkMode, mounted };
}
