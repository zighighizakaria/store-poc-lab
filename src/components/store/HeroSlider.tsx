"use client";

import { useEffect, useState } from "react";
import { getImageProps } from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useSnapCarousel } from "./useSnapCarousel";

export type HeroSlide = {
  id: string;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  href: string | null;
  desktopUrl: string;
  mobileUrl: string | null;
};

const AUTOPLAY_MS = 6000;

function SlideImage({ slide, priority }: { slide: HeroSlide; priority: boolean }) {
  const common = { alt: "", fill: true, sizes: "100vw", priority } as const;
  const desktop = getImageProps({ ...common, src: slide.desktopUrl }).props;
  const mobile = getImageProps({ ...common, src: slide.mobileUrl ?? slide.desktopUrl }).props;
  const { srcSet: mobileSrcSet, ...img } = mobile;
  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktop.srcSet} />
      <img {...img} srcSet={mobileSrcSet} alt="" className="object-cover" />
    </picture>
  );
}

// Home hero: Banner slides (scroll-snap, swipe on touch, arrows and dots).
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const t = useTranslations("home");
  const { ref, index, onScroll, goTo } = useSnapCarousel();
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => goTo((index + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [count, paused, index, goTo]);

  const arrow =
    "absolute top-1/2 hidden size-40 -translate-y-1/2 items-center justify-center rounded-pill bg-surface text-ink shadow-lg hover:bg-canvas md:inline-flex";

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("heroLabel")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative">
        <div
          ref={ref}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-card [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={t("slideOf", { current: i + 1, total: count })}
              className="relative aspect-[4/5] w-full shrink-0 snap-start bg-canvas md:aspect-[5/2]"
            >
              <SlideImage slide={slide} priority={i === 0} />
              <div className="absolute inset-x-16 bottom-16 flex flex-col gap-8 rounded-card bg-surface p-20 shadow-sm-2 md:inset-x-auto md:start-32 md:bottom-32 md:max-w-modal md:gap-12 md:p-24">
                <h2 className="text-title font-semibold tracking-tight md:text-display-sm">
                  {slide.title}
                </h2>
                {slide.subtitle ? (
                  <p className="text-body-lg text-muted">{slide.subtitle}</p>
                ) : null}
                {slide.href ? (
                  <ButtonLink
                    href={slide.href}
                    variant="accent"
                    size="lg"
                    className="mt-4 self-start"
                    tabIndex={index === i ? undefined : -1}
                  >
                    {slide.ctaLabel ?? t("heroCta")}
                  </ButtonLink>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {count > 1 ? (
          <>
            <button
              type="button"
              aria-label={t("previousSlide")}
              onClick={() => goTo((index - 1 + count) % count)}
              className={cn(arrow, "start-16")}
            >
              <ChevronLeft aria-hidden="true" strokeWidth={1.5} className="size-16 rtl:-scale-x-100" />
            </button>
            <button
              type="button"
              aria-label={t("nextSlide")}
              onClick={() => goTo((index + 1) % count)}
              className={cn(arrow, "end-16")}
            >
              <ChevronRight aria-hidden="true" strokeWidth={1.5} className="size-16 rtl:-scale-x-100" />
            </button>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="flex justify-center">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={t("goToSlide", { current: i + 1 })}
              aria-current={index === i ? "true" : undefined}
              onClick={() => goTo(i)}
              className="inline-flex size-24 items-center justify-center rounded-pill"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "block h-8 rounded-pill transition-all duration-base",
                  index === i ? "w-24 bg-ink" : "w-8 bg-cool-stone",
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
