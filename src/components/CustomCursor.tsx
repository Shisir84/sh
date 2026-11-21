import { useEffect, useRef, useState } from 'react';

const TRAIL_COUNT = 5;

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const auraRef = useRef<HTMLDivElement | null>(null);
  const trailRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const evaluateSupport = () => {
      const hasTouchOnly =
        window.matchMedia('(pointer: coarse)').matches && !finePointer.matches;
      const shouldEnable =
        finePointer.matches && !hasTouchOnly && !reducedMotion.matches && window.innerWidth >= 768;
      setEnabled(shouldEnable);
      if (shouldEnable) {
        document.documentElement.classList.add('volex-custom-cursor');
      } else {
        document.documentElement.classList.remove('volex-custom-cursor');
      }
    };

    evaluateSupport();
    finePointer.addEventListener('change', evaluateSupport);
    reducedMotion.addEventListener('change', evaluateSupport);
    window.addEventListener('resize', evaluateSupport);

    const disableOnTouch = () => {
      setEnabled(false);
      document.documentElement.classList.remove('volex-custom-cursor');
    };
    window.addEventListener('touchstart', disableOnTouch, { passive: true, once: true });

    return () => {
      document.documentElement.classList.remove('volex-custom-cursor');
      finePointer.removeEventListener('change', evaluateSupport);
      reducedMotion.removeEventListener('change', evaluateSupport);
      window.removeEventListener('resize', evaluateSupport);
      window.removeEventListener('touchstart', disableOnTouch);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let visible = false;
    let mode: 'default' | 'interactive' | 'card' | 'hidden' = 'default';
    let clicking = false;

    const trail = Array.from({ length: TRAIL_COUNT }, () => ({
      x: mouseX,
      y: mouseY,
    }));

    const updateMode = (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        mode = 'default';
        return;
      }
      if (target.closest('input, textarea, select, [contenteditable="true"]')) {
        mode = 'hidden';
        return;
      }
      if (target.closest('a, button, [role="button"], label[for]')) {
        mode = 'interactive';
        return;
      }
      if (target.closest('[data-cursor="card"]')) {
        mode = 'card';
        return;
      }
      mode = 'default';
    };

    const handleMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      visible = true;
      updateMode(e.target);
    };

    const handleDown = () => {
      clicking = true;
    };
    const handleUp = () => {
      clicking = false;
    };
    const handleLeave = () => {
      visible = false;
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('mousedown', handleDown, { passive: true });
    window.addEventListener('mouseup', handleUp, { passive: true });
    document.addEventListener('mouseleave', handleLeave);

    let rafId = 0;
    const renderFrame = () => {
      const mainEl = mainRef.current;
      const auraEl = auraRef.current;

      if (mainEl && auraEl) {
        const isHidden = !visible || mode === 'hidden';
        mainEl.style.opacity = isHidden ? '0' : '1';
        auraEl.style.opacity = isHidden ? '0' : '1';
        mainEl.dataset.mode = mode;
        mainEl.dataset.clicking = clicking ? 'true' : 'false';
        auraEl.dataset.mode = mode;
        auraEl.dataset.clicking = clicking ? 'true' : 'false';

        const scale = clicking ? 0.82 : mode === 'interactive' ? 1.28 : mode === 'card' ? 1.18 : 1;
        mainEl.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%) scale(${scale})`;

        const auraScale = clicking ? 1.35 : mode === 'interactive' ? 1.55 : mode === 'card' ? 1.35 : 1;
        auraEl.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%) scale(${auraScale})`;

        let prevX = mouseX;
        let prevY = mouseY;
        for (let i = 0; i < TRAIL_COUNT; i += 1) {
          const point = trail[i];
          const ease = 0.34 - i * 0.045;
          point.x += (prevX - point.x) * ease;
          point.y += (prevY - point.y) * ease;
          prevX = point.x;
          prevY = point.y;

          const dot = trailRefs.current[i];
          if (dot) {
            dot.style.opacity = isHidden ? '0' : String((TRAIL_COUNT - i) / (TRAIL_COUNT * 2.1));
            dot.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%) rotate(45deg) scale(${1 - i * 0.14})`;
          }
        }
      }

      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      document.removeEventListener('mouseleave', handleLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      id="volex-custom-cursor-layer"
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[120] overflow-hidden"
    >
      {/* Trailing arcane particles */}
      {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            trailRefs.current[i] = el;
          }}
          className="fixed top-0 left-0 w-2 h-2 bg-violet-400/80 shadow-[0_0_8px_rgba(167,139,250,0.8)] will-change-transform"
          style={{ opacity: 0 }}
        />
      ))}

      {/* Soft purple outer aura */}
      <div
        ref={auraRef}
        data-mode="default"
        className="fixed top-0 left-0 w-9 h-9 rounded-full border border-violet-400/50 bg-violet-500/12 shadow-[0_0_24px_rgba(168,85,247,0.55)] transition-[border-color,background-color] duration-150 will-change-transform data-[mode=interactive]:border-amber-300/80 data-[mode=interactive]:bg-violet-500/25 data-[mode=card]:border-cyan-300/75"
        style={{ opacity: 0 }}
      />

      {/* Glowing purple crystal diamond */}
      <div
        ref={mainRef}
        data-mode="default"
        className="fixed top-0 left-0 w-3.5 h-3.5 rotate-45 rounded-[3px] bg-gradient-to-br from-fuchsia-300 via-violet-400 to-purple-600 border border-white/80 shadow-[0_0_16px_rgba(192,132,252,0.95)] transition-[background,box-shadow] duration-150 will-change-transform data-[mode=interactive]:from-amber-200 data-[mode=interactive]:to-violet-400 data-[mode=card]:from-cyan-200 data-[mode=card]:to-violet-500"
        style={{ opacity: 0 }}
      />
    </div>
  );
}
