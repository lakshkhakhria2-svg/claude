import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';

// LK Media brand (from design-system/lk-media/MASTER.md)
const PLUM = '#831843', DEEP = '#5B0F2E', PINK = '#EC4899', PINK_SOFT = '#FBCFE8', CYAN = '#06B6D4', CYAN_INK = '#083344';
const DISPLAY = 'Archivo, system-ui, sans-serif', BODY = "'Space Grotesk', system-ui, sans-serif";

// Timeline (30 fps, music is 120 BPM: 15 frames per beat, drums from frame 60, end card at 627)
const T = 15;
const D = { intro: 75, lk: 135, cadence: 165, northvault: 150, brightwater: 177, end: 90 };
export const TOTAL = Object.values(D).reduce((a, b) => a + b, 0) - 5 * T; // 717

const useSpring = (delay: number, damping = 14) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  return spring({ frame: f - delay, fps, config: { damping, mass: 0.7 } });
};

const Words: React.FC<{ text: string; start: number; size: number; color?: string; highlight?: string[] }> = ({ text, start, size, color = '#fff', highlight = [] }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  return (
    <span>
      {text.split(' ').map((w, i) => {
        const s = spring({ frame: f - start - i * 3, fps, config: { damping: 13, mass: 0.6 } });
        return (
          <span key={i} style={{ display: 'inline-block', marginRight: size * 0.24, opacity: s, transform: `translateY(${(1 - s) * size * 0.6}px)`,
            color: highlight.includes(w) ? PINK : color }}>{w}</span>
        );
      })}
    </span>
  );
};

const BrandBg: React.FC<{ from?: string; to?: string }> = ({ from = '#BE185D', to = DEEP }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at ${20 + Math.sin(f / 40) * 6}% ${15 + Math.cos(f / 50) * 6}%, ${from} 0%, ${PLUM} 52%, ${to} 100%)` }}>
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: CYAN, opacity: 0.14, filter: 'blur(120px)',
        left: 1300 + Math.sin(f / 35) * 60, top: 600 + Math.cos(f / 45) * 50 }} />
    </AbsoluteFill>
  );
};

const Logo: React.FC<{ delay: number; size: number }> = ({ delay, size }) => {
  const s = useSpring(delay, 10);
  return <Img src={staticFile('logo.png')} style={{ width: size, height: size, borderRadius: '50%', transform: `scale(${s}) rotate(${(1 - s) * -30}deg)`, boxShadow: '0 0 0 6px rgba(255,255,255,.22), 0 30px 60px rgba(0,0,0,.35)' }} />;
};

const Intro = () => {
  const f = useCurrentFrame();
  const draw = interpolate(f, [34, 52], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const pulse = interpolate(f, [58, 62, 72], [1, 1.04, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <BrandBg />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', transform: `scale(${pulse})` }}>
        <Logo delay={0} size={190} />
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 104, lineHeight: 1.02, letterSpacing: -3, marginTop: 44, width: 1500 }}>
          <Words text="Websites that make" start={8} size={104} /><br />
          <span style={{ position: 'relative' }}>
            <Words text="startups look funded." start={20} size={104} highlight={['funded.']} />
            <svg viewBox="0 0 400 20" style={{ position: 'absolute', right: 30, bottom: -18, width: 400, height: 22 }}>
              <path d="M4 14 C 120 4, 280 4, 396 14" fill="none" stroke={CYAN} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={draw} />
            </svg>
          </span>
        </div>
        <div style={{ fontFamily: BODY, fontSize: 34, color: PINK_SOFT, marginTop: 34, opacity: interpolate(f, [40, 55], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          Web design for early-stage startups
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

type Site = { name: string; tag: string; bullets: string[]; full: string; fullH: number; mobile: string; url: string; scroll: number; bg: [string, string]; accent: string; concept: boolean };

const SiteScene: React.FC<{ site: Site; dur: number }> = ({ site, dur }) => {
  const f = useCurrentFrame();
  const W = 1080, BAR = 46, H = 740, scale = W / 1440;
  const nameSize = site.name.length > 10 ? 86 : 104; // keep long names clear of the browser
  const enter = useSpring(0, 16), phone = useSpring(14, 13);
  const y = interpolate(f, [26, dur - 28], [0, site.scroll * scale], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${site.bg[0]}, ${site.bg[1]})` }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,.10), transparent 55%)' }} />
      {/* Left column */}
      <div style={{ position: 'absolute', left: 110, top: 250, width: 560, color: '#fff' }}>
        <div style={{ display: 'inline-flex', gap: 10, alignItems: 'center', fontFamily: BODY, fontWeight: 700, fontSize: 24, padding: '8px 18px', borderRadius: 999,
          background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.25)', opacity: useSpring(4), transform: `translateX(${(1 - useSpring(4)) * -40}px)` }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: site.accent }} />{site.tag}{site.concept ? ' · concept' : ''}
        </div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: nameSize, letterSpacing: -3, marginTop: 26, lineHeight: 1, whiteSpace: 'nowrap' }}>
          <Words text={site.name} start={8} size={nameSize} />
        </div>
        <div style={{ marginTop: 40, display: 'grid', gap: 22 }}>
          {site.bullets.map((b, i) => {
            const s = useSpring(22 + i * 8);
            return (
              <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', fontFamily: BODY, fontSize: 30, lineHeight: 1.3, opacity: s, transform: `translateX(${(1 - s) * -30}px)` }}>
                <span style={{ flex: 'none', marginTop: 12, width: 12, height: 12, borderRadius: 6, background: site.accent }} />{b}
              </div>
            );
          })}
        </div>
      </div>
      {/* Browser */}
      <div style={{ position: 'absolute', left: 720, top: 170, width: W, height: H, borderRadius: 20, overflow: 'hidden', background: '#fff',
        boxShadow: '0 50px 100px rgba(0,0,0,.45)', opacity: enter, transform: `translateY(${(1 - enter) * 80}px) scale(${0.94 + enter * 0.06})` }}>
        <div style={{ height: BAR, background: '#E5E7EB', display: 'flex', alignItems: 'center', gap: 9, padding: '0 18px' }}>
          {['#F87171', '#FBBF24', '#34D399'].map(c => <i key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c, display: 'block' }} />)}
          <span style={{ marginLeft: 18, background: '#fff', borderRadius: 8, padding: '5px 16px', fontFamily: BODY, fontSize: 17, color: '#475569' }}>{site.url}</span>
        </div>
        <div style={{ position: 'relative', height: H - BAR, overflow: 'hidden' }}>
          <Img src={staticFile(site.full)} style={{ width: W, height: site.fullH * scale, transform: `translateY(${-y}px)` }} />
        </div>
      </div>
      {/* Phone */}
      <div style={{ position: 'absolute', left: 1570, top: 420, width: 300, height: 610, borderRadius: 46, border: '12px solid #0B0B0F', overflow: 'hidden', background: '#000',
        boxShadow: '0 40px 90px rgba(0,0,0,.5)', transform: `translateY(${(1 - phone) * 500}px) rotate(${(1 - phone) * 8 + 2}deg)` }}>
        <Img src={staticFile(site.mobile)} style={{ width: '100%', display: 'block' }} />
      </div>
    </AbsoluteFill>
  );
};

const End = () => {
  const f = useCurrentFrame();
  const pill = useSpring(30, 11);
  const out = interpolate(f, [72, 90], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <BrandBg />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Logo delay={0} size={170} />
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 92, lineHeight: 1.04, letterSpacing: -2.5, marginTop: 40, width: 1500 }}>
          <Words text="Your startup's website," start={6} size={92} /><br /><Words text="live in 2–4 weeks." start={16} size={92} highlight={['2–4']} />
        </div>
        <div style={{ marginTop: 46, fontFamily: BODY, fontWeight: 700, fontSize: 42, color: CYAN_INK, background: CYAN, padding: '16px 38px', borderRadius: 20,
          transform: `scale(${pill})`, boxShadow: '0 20px 40px rgba(0,0,0,.25)' }}>lk-media.netlify.app</div>
        <div style={{ marginTop: 30, fontFamily: BODY, fontSize: 30, color: PINK_SOFT, opacity: useSpring(40) }}>Fixed price · Mobile-first · 90+ Lighthouse</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const SITES: Record<string, Site> = {
  lk: { name: 'LK Media', tag: 'Studio site', concept: false, url: 'lk-media.netlify.app', full: 'lk-media-full-page.jpg', fullH: 5336, mobile: 'lk-media-mobile.jpg', scroll: 1700,
    bullets: ['Filterable portfolio grid', 'Fixed-price packages', '98–100 Lighthouse performance'], bg: [PLUM, DEEP], accent: CYAN },
  cadence: { name: 'Cadence', tag: 'SaaS landing page', concept: true, url: 'lk-media.netlify.app/work/cadence', full: 'cadence-full-page.jpg', fullH: 3461, mobile: 'cadence-mobile.jpg', scroll: 2000,
    bullets: ['Hero adapts to 3 audiences', 'Live product preview', '3-tier pricing'], bg: ['#0F766E', '#0B3B38'], accent: '#F97316' },
  northvault: { name: 'Northvault', tag: 'Fintech website', concept: true, url: 'lk-media.netlify.app/work/northvault', full: 'northvault-full-page.jpg', fullH: 3803, mobile: 'northvault-mobile.jpg', scroll: 2100,
    bullets: ['Security built into the hero', 'Accessible runway chart', 'Dark, high-trust design'], bg: ['#1E293B', '#020617'], accent: '#F59E0B' },
  brightwater: { name: 'Brightwater', tag: 'Local service site', concept: true, url: 'lk-media.netlify.app/work/brightwater', full: 'brightwater-full-page.jpg', fullH: 3673, mobile: 'brightwater-mobile.jpg', scroll: 2300,
    bullets: ['Instant price calculator', 'Open pricing table', 'Click-to-call booking'], bg: ['#0891B2', '#0C3A4A'], accent: '#22C55E' },
};

export const Showreel = () => {
  const tr = (dir: 'from-right' | 'from-bottom') => <TransitionSeries.Transition presentation={slide({ direction: dir })} timing={linearTiming({ durationInFrames: T, easing: Easing.inOut(Easing.cubic) })} />;
  return (
    <AbsoluteFill style={{ backgroundColor: DEEP }}>
      <Audio src={staticFile('music.wav')} />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={D.intro}><Intro /></TransitionSeries.Sequence>
        {tr('from-bottom')}
        <TransitionSeries.Sequence durationInFrames={D.lk}><SiteScene site={SITES.lk} dur={D.lk} /></TransitionSeries.Sequence>
        {tr('from-right')}
        <TransitionSeries.Sequence durationInFrames={D.cadence}><SiteScene site={SITES.cadence} dur={D.cadence} /></TransitionSeries.Sequence>
        {tr('from-right')}
        <TransitionSeries.Sequence durationInFrames={D.northvault}><SiteScene site={SITES.northvault} dur={D.northvault} /></TransitionSeries.Sequence>
        {tr('from-right')}
        <TransitionSeries.Sequence durationInFrames={D.brightwater}><SiteScene site={SITES.brightwater} dur={D.brightwater} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={D.end}><End /></TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
