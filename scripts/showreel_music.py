# Original 24s track for the LK Media showreel (120 BPM, C–G–Am–F). Fully synthesized, no samples.
import numpy as np, wave, sys
SR = 44100; DUR = 23.9; BPM = 120; BEAT = 60 / BPM; BAR = 4 * BEAT
N = int(SR * DUR); t = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
CHORDS = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]  # C G Am F
ROOTS = [36, 31, 33, 29]

def add(sig, start, gain=1.0, pan=0.0):
    i = int(start * SR); j = min(N, i + len(sig))
    if i >= N: return
    s = sig[: j - i] * gain
    L[i:j] += s * np.sqrt(0.5 * (1 - pan)); R[i:j] += s * np.sqrt(0.5 * (1 + pan))

def env(n, a, d, sustain=1.0, rel=None):
    e = np.ones(n) * sustain; na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na)
    if rel: nr = min(n, int(rel * SR)); e[-nr:] *= np.linspace(1, 0, nr)
    if d: e[na:] *= np.exp(-np.arange(n - na) / (d * SR))
    return e

# Pad: soft additive saw (6 harmonics), detuned pair, one chord per bar
for bar in range(12):
    ch = CHORDS[bar % 4]; n = int(BAR * SR * 1.05); tt = np.arange(n) / SR
    for k, m in enumerate(ch):
        f = hz(m)
        for det, pan in ((-0.12, -0.6), (0.12, 0.6)):
            s = sum(np.sin(2 * np.pi * f * h * (1 + det / 100) * tt) / h ** 1.6 for h in range(1, 7))
            add(s * env(n, 0.25, 0, rel=0.3), bar * BAR, 0.035, pan)

# Kick envelope (for sidechain) and drums from bar 1 to bar 10 (2s .. 20.9s)
side = np.ones(N)
def kick(at):
    n = int(0.35 * SR); tt = np.arange(n) / SR
    f = 45 + 90 * np.exp(-tt * 30); ph = 2 * np.pi * np.cumsum(f) / SR
    add(np.sin(ph) * np.exp(-tt * 9), at, 0.55)
    i = int(at * SR); m = min(N, i + int(0.3 * SR))
    side[i:m] = np.minimum(side[i:m], 0.45 + 0.55 * (1 - np.exp(-np.arange(m - i) / (0.08 * SR))))
def hat(at, g):
    n = int(0.06 * SR); x = rng.standard_normal(n); x = x - np.convolve(x, np.ones(6) / 6, 'same')
    add(x * np.exp(-np.arange(n) / (0.012 * SR)), at, g, 0.3)
def clap(at):
    n = int(0.18 * SR); x = rng.standard_normal(n); x = np.convolve(x, np.ones(3) / 3, 'same') - np.convolve(x, np.ones(25) / 25, 'same')
    e = np.exp(-np.arange(n) / (0.045 * SR)); add(x * e, at, 0.22, -0.1)

DRUM_START, DRUM_END = 1, 10  # bars
for bar in range(DRUM_START, DRUM_END + 1):
    for b in range(4):
        at = bar * BAR + b * BEAT
        if at >= 20.9: break
        kick(at); hat(at + BEAT / 2, 0.09)
        if b in (1, 3): clap(at)
        if bar >= 3: hat(at + BEAT / 4, 0.035); hat(at + 3 * BEAT / 4, 0.035)

# Bass: offbeat-pumping eighths, bars 1..10
for bar in range(1, 11):
    f = hz(ROOTS[bar % 4] + 12)
    for e8 in range(8):
        at = bar * BAR + e8 * BEAT / 2
        if at >= 20.9: break
        n = int(BEAT / 2 * SR * 0.9); tt = np.arange(n) / SR
        s = np.tanh(1.8 * (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)))
        add(s * env(n, 0.005, 0.18), at, 0.16 if e8 % 2 else 0.10)

# Arp pluck: chord tones up an octave in 16ths, bars 2..10, ping-pong pan
for bar in range(2, 11):
    ch = CHORDS[bar % 4]; pattern = [0, 1, 2, 1, 0, 2, 1, 2] * 2
    for s16, idx in enumerate(pattern):
        at = bar * BAR + s16 * BEAT / 4
        if at >= 20.9: break
        f = hz(ch[idx] + 12 + (12 if s16 % 8 == 6 else 0)); n = int(0.25 * SR); tt = np.arange(n) / SR
        s = (2 / np.pi) * np.arcsin(np.sin(2 * np.pi * f * tt)) * np.exp(-tt * 14)
        add(s, at, 0.06, 0.5 if s16 % 2 else -0.5)
        add(s, at + 3 * BEAT / 4, 0.02, -0.5 if s16 % 2 else 0.5)  # dotted-8th echo

# Final chord (C major, bright) under end card
n = int(3.2 * SR); tt = np.arange(n) / SR
for m in (48, 60, 64, 67, 72, 76):
    s = sum(np.sin(2 * np.pi * hz(m) * h * tt) / h ** 2 for h in range(1, 5))
    add(s * env(n, 0.02, 1.4), 20.9, 0.05, 0.0)
# Riser into the drop at 2s
n = int(1.5 * SR); x = rng.standard_normal(n); x = x - np.convolve(x, np.ones(12) / 12, 'same')
add(x * np.linspace(0, 1, n) ** 3, 0.5, 0.022)

# Sidechain pads/arp by kick, master, fades
L *= side; R *= side
mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
fi = int(0.3 * SR); fo = int(2.0 * SR)
mix[:fi] *= np.linspace(0, 1, fi)[:, None]; mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
mix *= 0.89 / np.abs(mix).max()
out = (mix * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print('peak', round(float(np.abs(mix).max()), 3), 'rms', round(float(np.sqrt((mix ** 2).mean())), 3))
