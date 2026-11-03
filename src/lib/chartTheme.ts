import { useEffect, useState } from 'react';

// Chart colours validated for colour-blind separation and contrast on each
// surface (dataviz palette checks). SVG attributes can't read CSS variables,
// so charts pick the set for the active theme.
const LIGHT = { mood: '#5B4CDB', energy: '#B89A6E', grid: '#E6DFD3', axis: '#6E6880', surface: '#FFFDF9' };
const DARK = { mood: '#9D90F5', energy: '#CDB48C', grid: '#2F2B40', axis: '#A7A1B5', surface: '#1F1C2C' };

export function useChartTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark ? DARK : LIGHT;
}
