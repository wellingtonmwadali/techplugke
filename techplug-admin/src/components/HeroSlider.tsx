"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { heroSlides } from "@/lib/data";

export default function HeroSlider() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-[420px] overflow-hidden rounded-lg bg-ink text-white sm:h-[460px]">
      {heroSlides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === active ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <Image
            src={slide.image}
            alt={slide.headline}
            fill
            priority={i === 0}
            className="object-cover"
            sizes="(min-width: 1024px) 60vw, 100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-10 p-6 sm:bottom-12 sm:p-8">
            <p className="font-display text-xs uppercase tracking-[0.3em] text-signal">
              {slide.eyebrow}
            </p>
            <h1 className="mt-2 max-w-md font-display text-2xl leading-tight sm:text-3xl">
              {slide.headline}
            </h1>
            <Link
              href={slide.href}
              className="mt-4 inline-block rounded-full bg-signal px-6 py-2.5 text-sm font-semibold text-ink hover:brightness-95 transition"
            >
              {slide.cta}
            </Link>
          </div>
        </div>
      ))}

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {heroSlides.map((slide, i) => (
          <button
            key={slide.id}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setActive(i)}
            className={`h-2 rounded-full transition-all ${
              i === active ? "w-6 bg-signal" : "w-2 bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
