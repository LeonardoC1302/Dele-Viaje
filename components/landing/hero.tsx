import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Ridgeline } from '@/components/cordillera/ridgeline';
import { buttonVariants } from '@/components/ui/button';

/**
 * The hero fills the viewport minus the 68px header, with the content
 * vertically centred and the ridge pinned to the bottom edge — so the
 * first screen reads as one complete scene rather than a block that
 * stops partway down and leaves dead paper underneath.
 *
 * The ridge's cropping behaviour is handled inside `Ridgeline`
 * (top-anchored `slice`, so the crop always comes off the empty
 * mountain base and never off the peaks or the sun).
 *
 * The entrance is a CSS animation, not a JS one. An earlier version
 * used `motion/react` with `initial={{opacity: 0}}`, which left the
 * entire hero invisible whenever the client bundle didn't boot — the
 * headline, the subtext and both CTAs rendered at `opacity: 0` with no
 * error to explain it. `animate-fade-rise` degrades the right way: no
 * CSS animation support, or a stylesheet that never loads, and the
 * content is simply *there*. It also keeps this a Server Component.
 * `prefers-reduced-motion` is handled globally in globals.css.
 */
export async function Hero() {
  const t = await getTranslations('hero');

  return (
    <section className="relative flex min-h-[calc(100dvh-68px)] flex-col overflow-hidden">
      <div className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-1 items-center px-4 sm:px-7">
        <div className="max-w-[640px] animate-fade-rise py-14">
          {/*
            Dawn is the scarcest thing in this system and the primary
            CTA has first claim on it. An earlier version set the whole
            second clause in dawn — two full display lines, a larger
            orange mass than the button it was supposed to lead the eye
            toward. Now a single word carries the emphasis.
          */}
          <h1 className="text-display-md font-extrabold text-sand-900 sm:text-display-lg lg:text-display-xl dark:text-sand-50">
            {t('headlineLine1')}{' '}
            {t('headlineLine2')
              .split(' ')
              .map((word, i, words) =>
                i === words.length - 1 ? (
                  <span key={i} className="text-dawn-600 dark:text-dawn-400">
                    {word}
                  </span>
                ) : (
                  <span key={i}>{word} </span>
                )
              )}
          </h1>

          <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-sand-600 dark:text-sand-300">
            {t('subtext')}
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/feed" className={buttonVariants({ size: 'lg', variant: 'primary' })}>
              {t('findTrip')}
            </Link>
            <Link href="/trips/new" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
              {t('createTrip')}
            </Link>
          </div>
        </div>
      </div>

      <div className="relative h-[150px] shrink-0 sm:h-[210px] lg:h-[280px]" aria-hidden="true">
        <Ridgeline profile="cordillera" />
      </div>
    </section>
  );
}
