'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { Link } from '@/i18n/navigation';
import { buttonVariants } from '@/components/ui/button';
import { Blob } from '@/components/landing/canopy-blobs';

gsap.registerPlugin(ScrollTrigger);

export function Hero() {
  const t = useTranslations('hero');
  const sectionRef = useRef<HTMLElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      // Three blob layers drift at different speeds as the hero scrolls past.
      // Distances are kept well inside each layer's buffer (see className)
      // so nothing ever runs out of content mid-scroll.
      const layers: [React.RefObject<HTMLDivElement | null>, number][] = [
        [backRef, -70],
        [midRef, -150],
        [frontRef, -250],
      ];

      layers.forEach(([ref, distance]) => {
        gsap.to(ref.current, {
          y: distance,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.4,
            invalidateOnRefresh: true,
          },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-neutral-50 pt-24 dark:bg-neutral-950"
    >
      {/*
        Each layer's buffer (calc(100% + Nrem), offset -top-N) is sized well
        past the largest travel distance above, so a layer can never run out
        of vertical room mid-scroll. Blobs are large and overlapping so the
        frame stays covered at rest and at full scroll offset alike.
      */}
      <div
        ref={backRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-12 h-[calc(100%+12rem)]"
      >
        <Blob className="absolute -left-20 -top-10 h-[26rem] w-[26rem] rotate-12 text-forest-100 dark:text-forest-900/60" />
        <Blob className="absolute -right-16 top-1/3 h-[30rem] w-[30rem] -rotate-6 text-forest-200 dark:text-forest-900" />
        <Blob className="absolute left-1/4 bottom-0 h-80 w-80 rotate-45 text-forest-100 dark:text-forest-900/50" />
      </div>

      <div
        ref={midRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-16 h-[calc(100%+18rem)]"
      >
        <Blob className="absolute left-[-8rem] top-10 h-[22rem] w-[22rem] rotate-[20deg] text-forest-300 dark:text-forest-700/70" />
        <Blob className="absolute right-10 top-1/2 h-72 w-72 -rotate-12 text-forest-400/80 dark:text-forest-700/60" />
        <Blob className="absolute left-1/3 bottom-10 h-80 w-80 rotate-[80deg] text-forest-300 dark:text-forest-800" />
      </div>

      <div
        ref={frontRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 h-[calc(100%+26rem)]"
      >
        <Blob className="absolute -right-12 top-16 h-64 w-64 rotate-[15deg] text-forest-500/70 dark:text-forest-600/50" />
        <Blob className="absolute left-6 top-1/2 h-56 w-56 -rotate-[25deg] text-forest-600/60 dark:text-forest-500/40" />
        <Blob className="absolute right-1/4 bottom-6 h-64 w-64 rotate-[130deg] text-forest-500/50 dark:text-forest-600/40" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1400px] flex-1 flex-col items-center justify-center px-4 text-center sm:px-6 lg:px-8">
        <h1 className="max-w-[720px] text-4xl font-bold leading-tight tracking-tight text-neutral-900 md:text-5xl lg:text-[3.25rem] dark:text-neutral-50">
          {t('headlineLine1')}
          <span className="block text-forest-700 dark:text-forest-300">
            {t('headlineLine2')}
          </span>
        </h1>

        <p className="mt-6 max-w-[480px] text-lg leading-relaxed text-neutral-700 dark:text-neutral-200">
          {t('subtext')}
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link href="/feed" className={buttonVariants({ size: 'lg', variant: 'primary' })}>
            {t('findTrip')}
          </Link>
          <Link href="/trips/new" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
            {t('createTrip')}
          </Link>
        </div>
      </div>
    </section>
  );
}
