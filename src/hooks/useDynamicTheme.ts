import { useEffect, useState } from 'react';

type ThemeColors = {
  bg: string;
  primary: string;
  secondary: string;
  text: string;
  ink: string;
  surface: string;
  muted: string;
  border: string;
  blobs: string[];
};

const SUNNY_PALETTE: ThemeColors = {
  bg: '#fffcf5', // Warm sunny off-white
  primary: '#f59e0b', // Vibrant amber
  secondary: '#ea580c', // Deep orange
  text: '#451a03', // Deep warm brown
  ink: '#1c1917', // Near black
  surface: '#ffffff',
  muted: '#d97706',
  border: '#fef3c7',
  blobs: ['#fef3c7', '#fde68a', '#fbbf24'] // Yellow/Amber blobs
};

export function useDynamicTheme() {
  const [palette] = useState<ThemeColors>(SUNNY_PALETTE);

  useEffect(() => {
    // Apply to CSS variables once
    const root = document.documentElement;
    root.style.setProperty('--bg-color', SUNNY_PALETTE.bg);
    root.style.setProperty('--primary-color', SUNNY_PALETTE.primary);
    root.style.setProperty('--secondary-color', SUNNY_PALETTE.secondary);
    root.style.setProperty('--text-color', SUNNY_PALETTE.text);
    root.style.setProperty('--ink-color', SUNNY_PALETTE.ink);
    root.style.setProperty('--surface-color', SUNNY_PALETTE.surface);
    root.style.setProperty('--muted-color', SUNNY_PALETTE.muted);
    root.style.setProperty('--border-color', SUNNY_PALETTE.border);

    // Always light mode
    root.classList.remove('dark');
  }, []);

  return { palette };
}
