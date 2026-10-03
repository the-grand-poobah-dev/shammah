// Zero-dependency, pleasant faith-app sound profile generator using Web Audio API
// Tailored with rich, serene harmonic profiles for every engagement activity

let audioCtx = null;
let soundEnabled = true;

if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('shammah_sound_enabled');
    if (saved !== null) {
      soundEnabled = saved === 'true';
    }
  } catch {}
}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('shammah_sound_enabled', enabled ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('shammah:sound-toggled', { detail: enabled }));
    } catch {}
  }
  // Play immediate audio confirmation when user enables sound
  if (enabled) {
    playSound('soundToggle', true);
  }
}

/**
 * Plays distinctive, serene sound alerts for different engagement activities:
 * - 'reaction' | 'reaction_amen' | 'reaction_praise' | 'reaction_fire' | 'reaction_peace': faith reactions
 * - 'comment' | 'commented': comment engagement bubble-pop
 * - 'repost' | 'reposted': swift uplifting double ping
 * - 'share' | 'shared': celestial swoosh-ping
 * - 'offline' | 'offline_save': grounded download confirmation chime
 * - 'offline_remove': gentle descending tone
 * - 'project': deep sanctuary presentation glass gong
 * - 'poll_vote': tactile marimba block tap
 * - 'bookmark': gentle latch chime
 * - 'postPublished': majestic triumphant harp arpeggio
 * - 'soundToggle': welcoming melodic bell
 * - 'themeToggle': soft ambient mode chime
 * - 'options_open': delicate micro-tap
 * - 'messageSent' / 'messageReceived': fellowship inbox pings
 * - 'alert': warm notification bell
 */
export function playSound(type, forcePlay = false) {
  if (!soundEnabled && !forcePlay) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    switch (type) {
      // 1. Reactions (with specific variants for faith expressions)
      case 'reaction':
      case 'reaction_love': {
        // Delicate crystal chime with harmonic shimmer (C6 -> G6 -> C7)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(1046.5, now); // C6
        osc1.frequency.exponentialRampToValueAtTime(1567.98, now + 0.12); // G6

        osc2.frequency.setValueAtTime(2093, now); // C7
        osc2.frequency.exponentialRampToValueAtTime(3135.96, now + 0.14);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.28);
        osc2.stop(now + 0.28);
        break;
      }

      case 'reaction_amen': {
        // Warm prayer bell tone with soft sub-harmonic resonance
        const freqs = [659.25, 987.77, 1318.51]; // E5, B5, E6
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.04;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.07, start);
          gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.45);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.45);
        });
        break;
      }

      case 'reaction_praise': {
        // Joyful double harp chime (G5 -> D6 -> G6)
        [783.99, 1174.66, 1567.98].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.06;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.08, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.35);
        });
        break;
      }

      case 'reaction_fire': {
        // Ascending rapid holy-fire triad (A5 -> C#6 -> E6)
        [880, 1108.73, 1318.51].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.04;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.08, start + 0.1);

          gain.gain.setValueAtTime(0.07, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.22);
        });
        break;
      }

      // 2. Comment Engagement
      case 'comment':
      case 'commented': {
        // Crisp soothing water-drop bubble with harmonic chime
        const osc = ctx.createOscillator();
        const oscHarm = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.exponentialRampToValueAtTime(1280, now + 0.08);

        oscHarm.type = 'triangle';
        oscHarm.frequency.setValueAtTime(1080, now);
        oscHarm.frequency.exponentialRampToValueAtTime(2560, now + 0.08);

        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        oscHarm.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        oscHarm.start(now);
        osc.stop(now + 0.22);
        oscHarm.stop(now + 0.22);
        break;
      }

      // 3. Repost Engagement
      case 'repost':
      case 'reposted': {
        // Swift uplifting double ping (A5 -> D6)
        [880, 1174.66].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.08;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.09, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.26);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.26);
        });
        break;
      }

      // 4. Share Engagement
      case 'share':
      case 'shared': {
        // Celestial swoosh-ping with warm shimmer
        const osc = ctx.createOscillator();
        const oscShimmer = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.14); // E6

        oscShimmer.type = 'triangle';
        oscShimmer.frequency.setValueAtTime(880, now);
        oscShimmer.frequency.exponentialRampToValueAtTime(2637.02, now + 0.16);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

        osc.connect(gain);
        oscShimmer.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        oscShimmer.start(now);
        osc.stop(now + 0.32);
        oscShimmer.stop(now + 0.32);
        break;
      }

      // 5. Offline Download / Save Engagement
      case 'offline':
      case 'offline_save': {
        // Grounded, reassuring 3-note ascending chord (G4 -> C5 -> G5)
        [392.0, 523.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.07;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.08, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.35);
        });
        break;
      }

      case 'offline_remove': {
        // Gentle descending tone (G5 -> C5)
        [783.99, 523.25].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.08;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.06, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.25);
        });
        break;
      }

      // 6. Projection Screen Engagement
      case 'project': {
        // Cinematic deep glass gong (D4 -> A4 -> F#5 resonant sanctuary chord)
        const notes = [293.66, 440.0, 739.99];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.03);

          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.65);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.03);
          osc.stop(now + 0.65);
        });
        break;
      }

      // 7. Poll Voting Engagement
      case 'poll_vote': {
        // Tactile warm marimba tap
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
        break;
      }

      // 8. Bookmark / Playlist Save
      case 'bookmark': {
        // Subtle magnetic latch ping (F#5 -> C#6)
        [739.99, 1108.73].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.05;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.08, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.24);
        });
        break;
      }

      // 9. Post Options Menu Open
      case 'options_open': {
        // Delicate micro-tap
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1150, now);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }

      // 10. Sound Toggle Enabled Confirmation
      case 'soundToggle': {
        // Welcoming double bell chime (G5 -> C6)
        [783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.09;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.09, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.35);
        });
        break;
      }

      // 11. Dark/Light Theme Toggle Chime
      case 'themeToggle': {
        // Subtle soothing cosmic breath
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.22);
        break;
      }

      // 12. Post Published Triumphant Arpeggio
      case 'postPublished': {
        // Uplifting arpeggio chord (E5, G#5, B5, E6)
        const notes = [659.25, 830.61, 987.77, 1318.51];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.055;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.09, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.42);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.42);
        });
        break;
      }

      case 'messageSent': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
        break;
      }

      case 'messageReceived': {
        [698.46, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.09;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.1, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.35);
        });
        break;
      }

      case 'typing': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200 + Math.random() * 200, now);

        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.035);
        break;
      }

      case 'alert': {
        [783.99, 1318.51].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.07;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.09, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.32);
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.debug('Sound playback skipped:', err);
  }
}
