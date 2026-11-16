"""Synthesise the soundtrack for the morph reel (deterministic, no samples).

usage: python3 audio.py cues.json out.wav
cues.json = {"total": seconds, "cues": [{"land": t, "start": t, "scene": i}, ...]}

Layers: plucky arpeggio bed (104 BPM), soft sub bass, and on every morph a pitched
whoosh that rises into the landing plus a short "plip" + thump on the landing frame.
"""
import json, sys, wave
import numpy as np

SR = 48000
rng = np.random.default_rng(8)


def env_pluck(n, decay):
    t = np.arange(n) / SR
    a = np.minimum(1, t / 0.004)
    return a * np.exp(-t / decay)


def pluck(freq, dur, decay=0.22, bright=0.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    w = (np.sin(2 * np.pi * freq * t)
         + bright * 0.5 * np.sin(2 * np.pi * 2 * freq * t) * np.exp(-t / (decay * 0.4))
         + bright * 0.25 * np.sin(2 * np.pi * 3 * freq * t) * np.exp(-t / (decay * 0.25)))
    return w * env_pluck(n, decay)


def onepole_lp(x, cutoffs):
    y = np.zeros_like(x)
    acc = 0.0
    a = np.exp(-2 * np.pi * cutoffs / SR)
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def place(buf, sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= buf.shape[0]:
        return
    sig = sig[: buf.shape[0] - i]
    l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    buf[i:i + len(sig), 0] += sig * gain * l
    buf[i:i + len(sig), 1] += sig * gain * r


def main(cues_path, out_path):
    spec = json.load(open(cues_path))
    total = spec["total"]
    n = int(total * SR) + SR
    mus = np.zeros((n, 2))
    sfx = np.zeros((n, 2))

    bpm = 104
    beat = 60 / bpm
    step = beat / 2  # eighth notes
    # Cmaj9 - Am9 - Fmaj9 - G6, bright but calm
    chords = [[48, 60, 64, 67, 71, 74], [45, 57, 60, 64, 67, 71], [41, 57, 60, 64, 65, 69], [43, 55, 59, 62, 64, 67]]
    pattern = [1, 3, 2, 4, 5, 3, 4, 2]
    k = 0
    t = 0.0
    while t < total:
        bar = int(t / (beat * 4))
        ch = chords[bar % 4]
        idx = pattern[k % 8]
        note = ch[idx]
        oct_up = 12 if (k // 8) % 2 and k % 4 == 3 else 0
        place(mus, pluck(midi(note + oct_up), 0.6, 0.20, 0.7), t, 0.16, pan=0.35 * np.sin(k * 1.3))
        if k % 8 == 0:
            place(mus, pluck(midi(ch[0] - 12), beat * 4, 0.9, 0.1), t, 0.30)
        k += 1
        t = k * step
    # fade in/out of the bed
    fade = np.ones(n)
    fi, fo = int(0.25 * SR), int(1.2 * SR)
    fade[:fi] = np.linspace(0, 1, fi)
    end = int(total * SR)
    fade[end - fo:end] = np.linspace(1, 0, fo)
    fade[end:] = 0
    mus *= fade[:, None]

    for i, c in enumerate(spec["cues"]):
        land, start = c["land"], c["start"]
        dur = max(0.25, land - start)
        m = int(dur * SR)
        tt = np.linspace(0, 1, m)
        noise = rng.standard_normal(m)
        cut = 300 + 5200 * tt ** 2
        wh = onepole_lp(noise, cut) * (tt ** 1.6) * 0.9
        # pitched component rising with the shape
        base = midi(60 + (i % 5) * 2)
        ph = np.cumsum(2 * np.pi * base * (0.5 + 0.5 * tt ** 1.5) / SR)
        wh += 0.25 * np.sin(ph) * tt ** 2
        place(sfx, wh, start, 0.55, pan=0.6 * (1 if i % 2 else -1))
        # landing: plip + soft thump
        place(sfx, pluck(midi(76 + (i % 4) * 2), 0.5, 0.12, 1.0), land, 0.32)
        th_n = int(0.25 * SR)
        th_t = np.arange(th_n) / SR
        thump = np.sin(2 * np.pi * (90 * np.exp(-th_t * 18) + 45) * th_t) * np.exp(-th_t / 0.07)
        place(sfx, thump, land, 0.55)

    out = mus + sfx
    out = out[: int((total) * SR)]
    out /= max(1e-9, np.abs(out).max()) / 0.8
    pcm = (out * 32767).astype(np.int16)
    with wave.open(out_path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
