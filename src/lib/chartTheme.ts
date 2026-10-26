import { useEffect, useState } from 'react';

// Chart colours validated for colour-blind separation and contrast on each
// surface (dataviz palette checks). SVG attributes can't read CSS variables,
// so charts pick the set for the active theme.
const LIGHT = { mood: '#3300FF', energy: '#E8661A', grid: '#DEDEE2', axis: '#626268', surface: '#FFFFFF' };
const DARK = { mood: '#8474FF', energy: '#F08A3E', grid: '#32323A', axis: '#A0A0A8', surface: '#1A1A1E' };

export function useChartTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark ? DARK : LIGHT;
}
