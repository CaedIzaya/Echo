import { useEffect, useRef, type RefObject } from 'react';

export type RevealVariant = 'fadeUp' | 'fadeIn' | 'scaleIn' | 'fadeLeft' | 'fadeRight';

interface UseScrollRevealOptions {
  variant?: RevealVariant;
  delay?: number;
  threshold?: number;
  once?: boolean;
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {},
): RefObject<T | null> {
  const { variant = 'fadeUp', delay = 0, threshold = 0.15, once = true } = options;
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.classList.add('reveal-hidden', `reveal-${variant}`);
    if (delay > 0) {
      el.style.transitionDelay = `${delay}ms`;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          el.classList.remove('reveal-hidden');
          el.classList.add('reveal-visible');
          if (once) observer.unobserve(el);
        } else if (!once) {
          el.classList.remove('reveal-visible');
          el.classList.add('reveal-hidden');
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [variant, delay, threshold, once]);

  return ref;
}

/**
 * CSS to include in the page's <style jsx> block:
 *
 * .reveal-hidden { opacity: 0; }
 * .reveal-visible { opacity: 1; }
 *
 * .reveal-fadeUp.reveal-hidden   { transform: translateY(32px); }
 * .reveal-fadeIn.reveal-hidden   { transform: none; }
 * .reveal-scaleIn.reveal-hidden  { transform: scale(0.92); }
 * .reveal-fadeLeft.reveal-hidden { transform: translateX(-32px); }
 * .reveal-fadeRight.reveal-hidden{ transform: translateX(32px); }
 *
 * .reveal-visible {
 *   transform: none;
 *   transition: opacity 0.7s cubic-bezier(0.34,1.56,0.64,1),
 *               transform 0.7s cubic-bezier(0.34,1.56,0.64,1);
 * }
 */
