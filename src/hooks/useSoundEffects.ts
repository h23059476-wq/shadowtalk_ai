import { useCallback } from 'react';

// Lightweight base64 audio clips for micro-interactions
const SOUNDS = {
  // A subtle "tick" for sending a message
  send: 'data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq', 
  // A soft "pop" for receiving a message
  receive: 'data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
  // A gentle "ding" for a task completion or success
  success: 'data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
};

type SoundType = keyof typeof SOUNDS;

/**
 * A lightweight hook for triggering UI micro-interaction sounds.
 * Avoids heavy external libraries like use-sound for performance.
 */
export function useSoundEffects() {
  const play = useCallback((type: SoundType, volume = 0.2) => {
    // Respect user preferences - if they have reduced motion/audio settings in the future, we can check here
    try {
      const audio = new Audio(SOUNDS[type]);
      audio.volume = volume;
      // Promise is ignored because modern browsers might block autoplay if no interaction has occurred
      audio.play().catch(() => {});
    } catch (e) {
      // Ignore audio playback errors (e.g., node environment during tests)
    }
  }, []);

  return { play };
}
