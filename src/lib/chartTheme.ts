import { useEffect, useState } from 'react';

// Chart colours validated for colour-blind separation and contrast on each
// surface (dataviz palette checks). SVG attributes can't read CSS variables,
// so charts pick the set for the active theme.
const LIGHT = { mood: '#3E8E5E', energy: '#8466CC', grid: '#E2DCD1', axis: '#687274', surface: '#FFFFFF' };
const DARK = { mood: '#4FA06F', energy: '#9579DC', grid: '#2D3944', axis: '#96A0A6', surface: '#1B242D' };

export function useChartTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark ? DARK : LIGHT;
}
