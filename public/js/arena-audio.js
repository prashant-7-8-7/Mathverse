/**
 * MathVerse Live Quiz Arena — Web Audio API Sound Synthesizer
 * Pure procedural audio synthesis (Zero external audio assets).
 */
(function() {
  let audioCtx = null;
  const STORAGE_KEY = 'mathverse_audio_muted';

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Ensure AudioContext is unlocked on first user gesture
  const unlockEvents = ['click', 'touchstart', 'keydown'];
  function unlockHandler() {
    getAudioContext();
    unlockEvents.forEach(e => window.removeEventListener(e, unlockHandler));
  }
  unlockEvents.forEach(e => window.addEventListener(e, unlockHandler, { passive: true }));

  const ArenaAudio = {
    isMuted: function() {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    },

    setMuted: function(muted) {
      localStorage.setItem(STORAGE_KEY, muted ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('arena:mute_change', { detail: { muted } }));
    },

    toggleMute: function() {
      const next = !this.isMuted();
      this.setMuted(next);
      return next;
    },

    // Gentle countdown second tick
    playTick: function() {
      if (this.isMuted()) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    },

    // Urgent tick for final 5 seconds
    playUrgentTick: function() {
      if (this.isMuted()) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.07);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    },

    // Answer lock click/blip
    playLock: function() {
      if (this.isMuted()) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(980, ctx.currentTime + 0.09);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    },

    // Sparkling victory chime (C5 -> E5 -> G5 -> C6)
    playCorrect: function() {
      if (this.isMuted()) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50];
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + (idx * 0.08);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.35);
      });
    },

    // Downward wrong answer buzzer
    playWrong: function() {
      if (this.isMuted()) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.32);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.32);
    },

    // Grand final podium fanfare
    playFanfare: function() {
      if (this.isMuted()) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      const chords = [
        { freqs: [523.25, 659.25, 783.99], time: 0, dur: 0.25 },
        { freqs: [587.33, 698.46, 880.00], time: 0.25, dur: 0.25 },
        { freqs: [659.25, 783.99, 987.77], time: 0.50, dur: 0.3 },
        { freqs: [1046.50, 1318.51, 1567.98], time: 0.85, dur: 0.9 }
      ];

      const now = ctx.currentTime;
      chords.forEach(c => {
        c.freqs.forEach(f => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + c.time;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, start);

          gain.gain.setValueAtTime(0.1, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + c.dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + c.dur);
        });
      });
    },

    // Attach UI button state
    initMuteButton: function(buttonEl) {
      if (!buttonEl) return;
      const updateIcon = () => {
        const muted = this.isMuted();
        buttonEl.innerHTML = muted 
          ? '<span aria-hidden="true">🔇</span><span class="sr-only">Unmute audio</span>' 
          : '<span aria-hidden="true">🔊</span><span class="sr-only">Mute audio</span>';
        buttonEl.classList.toggle('audio-muted', muted);
      };

      updateIcon();
      buttonEl.addEventListener('click', () => {
        this.toggleMute();
        updateIcon();
      });

      window.addEventListener('arena:mute_change', updateIcon);
    }
  };

  window.ArenaAudio = ArenaAudio;
})();
