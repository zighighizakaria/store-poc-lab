"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { useSnapCarousel } from "./useSnapCarousel";

export type GalleryImage = { id: string; url: string; alt: string };

// Large image with thumbnails (desktop) or swipe + dots (mobile). One
// scroll-snap strip serves both: thumbnails and dots call the same goTo().
// Remount it (key = color) to reset to the first image when the color changes.
export function Gallery({ images }: { images: GalleryImage[] }) {
  const t = useTranslations("product");
  const { ref, index, onScroll, goTo } = useSnapCarousel();
  const total = images.length;

  return (
    <div className="md:flex md:gap-12">
      {total > 1 ? (
        <ul className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:gap-8">
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={t("showImage", { current: i + 1, total })}
                aria-current={index === i ? "true" : undefined}
                className={cn(
                  "relative block aspect-[4/5] w-full overflow-hidden rounded-xl border-2 bg-tile transition-colors duration-fast",
                  index === i ? "border-ink" : "border-transparent hover:border-cool-stone",
                )}
              >
                <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative min-w-0 flex-1">
        <div
          ref={ref}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-image [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, i) => (
            <div
              key={image.id}
              role="group"
              aria-roledescription="slide"
              aria-label={t("showImage", { current: i + 1, total })}
              className="relative aspect-[4/5] w-full shrink-0 snap-center bg-tile"
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                sizes="(min-width: 1200px) 560px, (min-width: 768px) 50vw, 100vw"
                priority={i === 0}
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {total > 1 ? (
          <div className="absolute inset-x-0 bottom-12 flex justify-center md:hidden">
            <div className="flex items-center rounded-pill bg-surface/80 px-4">
              {images.map((image, i) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={t("showImage", { current: i + 1, total })}
                  aria-current={index === i ? "true" : undefined}
                  className="inline-flex size-24 items-center justify-center rounded-pill"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "block size-8 rounded-pill transition-colors duration-fast",
                      index === i ? "bg-ink" : "bg-cool-stone",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
