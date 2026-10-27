import type { HabitFrequency } from '../db/types';

export interface HabitSeed {
  id: string;
  name: string;
  icon: string;
  frequency: HabitFrequency;
  strength?: string;
  active?: boolean; // on the list from day one; the rest start archived, ready to restore
}

// Starter habits: general well-being plus ones linked to top strengths.
// Bottom-strength habits are kept small and easy to finish.
// Only three start active: a short list you can finish beats a long one you fall behind on.
export const STARTER_HABITS: HabitSeed[] = [
  { id: 'h-exercise', name: 'Exercise', icon: '🏃', frequency: { type: 'weekly', times: 3 }, strength: 'zest', active: true },
  { id: 'h-sleep', name: '8h sleep', icon: '😴', frequency: { type: 'daily' }, strength: 'self-regulation' },
  { id: 'h-meditate', name: 'Meditate', icon: '🧘', frequency: { type: 'daily' }, strength: 'spirituality' },
  { id: 'h-walk', name: 'Walk outside', icon: '🌳', frequency: { type: 'daily' }, strength: 'beauty', active: true },
  { id: 'h-no-alcohol', name: 'No alcohol', icon: '💧', frequency: { type: 'daily' }, strength: 'prudence' },
  { id: 'h-read', name: 'Read', icon: '📖', frequency: { type: 'daily' }, strength: 'love-of-learning' },
  { id: 'h-friend', name: 'Talk to a friend', icon: '💬', frequency: { type: 'weekly', times: 3 }, strength: 'love' },
  { id: 'h-connect', name: 'Connect with someone I love', icon: '❤️', frequency: { type: 'daily' }, strength: 'love' },
  { id: 'h-learn', name: 'Learn or explore something new', icon: '🔭', frequency: { type: 'daily' }, strength: 'curiosity' },
  { id: 'h-beauty', name: 'Notice one beautiful thing', icon: '🌸', frequency: { type: 'daily' }, strength: 'beauty' },
  { id: 'h-kindness', name: 'One act of kindness', icon: '🤝', frequency: { type: 'daily' }, strength: 'kindness' },
  { id: 'h-gratitude', name: 'Write 3 things I\'m grateful for', icon: '🙏', frequency: { type: 'daily' }, strength: 'gratitude', active: true },
];

export const HABIT_ICONS = ['🏃', '😴', '🧘', '🌳', '💧', '📖', '💬', '❤️', '🔭', '🌸', '🤝', '🙏', '🥗', '🚴', '🎵', '✍️', '☀️', '📵', '🧹', '🎨', '🐕', '🏊', '🌙', '🍎'];
