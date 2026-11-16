/**
 * Original placeholder mascot: a rounded body with a swoopy crest, purple #4b2a8c and
 * yellow #f5c542. Drawn from scratch for this app; NOT based on docs/product/assets/*.
 * Appears only at transitions (session start/end, recovery, welcome back), never mid-question.
 */
import { MASCOT_NAME } from '../copy';

export type Mood = 'happy' | 'cheer' | 'calm';

export function Mascot({ mood = 'happy', size = 72 }: { mood?: Mood; size?: number }) {
  const mouth =
    mood === 'cheer' ? 'M38 62 Q50 74 62 62 Z' : mood === 'calm' ? 'M40 64 Q50 68 60 64' : 'M39 62 Q50 71 61 62';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false" className="mascot-svg">
      <path d="M46 20 C40 6 58 2 66 10 C60 9 55 12 56 20 Z" fill="#f5c542" />
      <path d="M52 20 C50 10 62 8 70 14 C63 14 60 17 60 22 Z" fill="#4b2a8c" />
      <ellipse cx="50" cy="56" rx="34" ry="32" fill="#4b2a8c" />
      <ellipse cx="50" cy="62" rx="22" ry="20" fill="#f5c542" />
      <circle cx="39" cy="50" r="5" fill="#ffffff" />
      <circle cx="61" cy="50" r="5" fill="#ffffff" />
      <circle cx="40" cy="51" r="2.5" fill="#1d1233" />
      <circle cx="62" cy="51" r="2.5" fill="#1d1233" />
      <path d={mouth} stroke="#1d1233" strokeWidth="3" fill={mood === 'cheer' ? '#1d1233' : 'none'} strokeLinecap="round" />
    </svg>
  );
}

/** A mascot with a speech bubble. Text is plain React text (never HTML). */
export function MascotMoment({ text, mood = 'happy', testId }: { text: string; mood?: Mood; testId?: string }) {
  return (
    <div className="mascot-moment" data-testid={testId}>
      <Mascot mood={mood} />
      <p className="bubble">
        <span className="sr-only">{MASCOT_NAME} says: </span>
        {text}
      </p>
    </div>
  );
}
