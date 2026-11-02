import confetti from 'canvas-confetti';

/**
 * Trigger school-branded celebration confetti (Navy #0B1329 / Royal Blue #1E3A8A / Amber #F59E0B / Gold #FBBF24 / White)
 */
export const triggerSchoolCelebration = (intensity: 'light' | 'full' = 'full') => {
  try {
    const schoolColors = ['#F59E0B', '#D97706', '#1E3A8A', '#0B1329', '#FBBF24', '#FFFFFF'];

    if (intensity === 'light') {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: schoolColors,
        disableForReducedMotion: true,
        zIndex: 9999,
      });
      return;
    }

    // Full celebration: two cannon bursts from left and right
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      colors: schoolColors,
      disableForReducedMotion: true,
      zIndex: 9999,
    };

    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    };

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  } catch (err) {
    // Graceful fallback if window or canvas isn't supported
    console.debug('Confetti effect skipped:', err);
  }
};
