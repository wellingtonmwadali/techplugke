"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { ArrowUpRight, ShieldCheck, Truck, Star, Pause, Play } from "lucide-react";
import { Product } from "@/lib/types";
import { formatKes } from "@/lib/format";

const SWATCH_HEX: Record<string, string> = {
  black: "#0a0a0a",
  white: "#ffffff",
  brown: "#8b4513",
  tan: "#c9a06a",
  red: "#c8442f",
  blue: "#1e40af",
  grey: "#9ca3af",
  gray: "#9ca3af",
  green: "#3f6b3f",
  navy: "#1e293b",
};

function swatchColor(name: string) {
  return SWATCH_HEX[name.toLowerCase()] ?? "#d4d4d4";
}

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD = 60;

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -40 : 40, opacity: 0 }),
};

export default function HeroBento({
  heroProduct,
  newArrival,
  moreProducts,
  featuredCategorySlug,
  featuredCategoryName,
}: {
  heroProduct: Product;
  newArrival: Product | null;
  moreProducts: Product[];
  featuredCategorySlug: string;
  featuredCategoryName: string;
}) {
  // Hero slider: the hero product plus a couple more real catalog items — each slide carries
  // its own title/price/CTA/image, distinct from the "New Arrival" tile and mini-gallery below.
  const slides = useMemo(() => {
    const extras = moreProducts.filter((p) => p.id !== heroProduct.id).slice(0, 2);
    return [heroProduct, ...extras];
  }, [heroProduct, moreProducts]);

  const [[slideIndex, direction], setSlide] = useState<[number, number]>([0, 0]);
  const [autoplay, setAutoplay] = useState(true);
  const slide = slides[slideIndex];

  function goTo(index: number) {
    setSlide(([current]) => [index, index > current ? 1 : -1]);
  }

  function paginate(step: number) {
    setSlide(([current]) => {
      const next = (current + step + slides.length) % slides.length;
      return [next, step];
    });
  }

  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;
    const timer = setInterval(() => paginate(1), AUTOPLAY_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, slides.length, slideIndex]);

  function handleDragEnd(_event: unknown, info: PanInfo) {
    if (info.offset.x < -SWIPE_THRESHOLD) paginate(1);
    else if (info.offset.x > SWIPE_THRESHOLD) paginate(-1);
  }

  const slideImage = slide.images[0] ?? "/logo.png";

  return (
    <section className="bg-cream py-6">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:px-6 md:grid-cols-4 md:auto-rows-[minmax(9rem,auto)] md:px-8">
        {/* Main hero card — functions as a slider on every breakpoint */}
        <div
          className="relative flex flex-col overflow-hidden rounded-3xl bg-[#F8F8F6] shadow-soft md:col-span-2 md:row-span-2 md:min-h-[26rem] md:flex-row"
          onMouseEnter={() => setAutoplay(false)}
          onMouseLeave={() => setAutoplay(true)}
        >
          {/* Left column: copy + CTA — this panel owns all the padding, warm off-white bg */}
          <div className="relative z-10 flex flex-col justify-center bg-[#F8F8F6] p-8 sm:p-10 md:w-[45%] md:shrink-0">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={slide.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{slide.brand}</p>
                <h2 className="mt-2 text-4xl font-extrabold leading-tight tracking-tight text-slate-900">
                  {slide.name}
                </h2>
                <span className="mt-4 mb-6 block text-2xl font-bold text-slate-800">
                  {formatKes(slide.price)}
                </span>
                <Link
                  href={`/category/${slide.categorySlugs[0]}`}
                  className="flex w-fit items-center gap-2 rounded-full bg-[#D0F244] px-6 py-3 font-semibold text-slate-950 transition-transform hover:scale-105"
                >
                  View All Products <ArrowUpRight size={16} />
                </Link>
              </motion.div>
            </AnimatePresence>

            {slides.length > 1 && (
              <div className="mt-8 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {slides.map((s, i) => (
                    <button
                      key={s.id}
                      aria-label={`Show slide ${i + 1}`}
                      onClick={() => goTo(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === slideIndex ? "w-6 bg-slate-900" : "w-1.5 bg-slate-900/25"
                      }`}
                    />
                  ))}
                </div>
                <button
                  aria-label={autoplay ? "Pause slideshow" : "Play slideshow"}
                  onClick={() => setAutoplay((v) => !v)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:text-slate-700"
                >
                  {autoplay ? <Pause size={12} /> : <Play size={12} />}
                </button>
              </div>
            )}
          </div>

          {/* Right: full-bleed product photo panel — no padding/margin of its own, so it runs
              edge-to-edge on every breakpoint. Draggable for touch-swipe between slides. */}
          <motion.div
            className="relative h-64 w-full cursor-grab touch-pan-y active:cursor-grabbing sm:h-80 md:h-auto md:min-h-full md:flex-1"
            drag={slides.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
          >
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={slide.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                <Image
                  src={slideImage}
                  alt={slide.name}
                  fill
                  sizes="(min-width: 768px) 32vw, 100vw"
                  priority={slideIndex === 0}
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* New arrival card — full-width, roomier on mobile; compact on md+ */}
        {newArrival && (
          <Link
            href={`/product/${newArrival.slug}`}
            className="group relative w-full overflow-hidden rounded-3xl bg-[#1E40AF] px-6 py-8 text-white shadow-soft md:py-6"
          >
            <div className="relative z-10 flex items-start justify-between">
              <p className="text-xl font-semibold leading-snug md:text-lg">New Arrival</p>
              <ArrowUpRight size={18} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <p className="relative z-10 mt-2 max-w-[60%] truncate text-base font-medium md:text-sm">
              {newArrival.name}
            </p>
            <Image
              src={newArrival.images[0] ?? "/logo.png"}
              alt={newArrival.name}
              width={600}
              height={600}
              className="absolute -right-4 -bottom-2 w-3/4 max-w-none object-contain drop-shadow-[0_20px_25px_rgba(0,0,0,0.25)] transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
        )}

        {/* Category feature card — full-width, roomier on mobile; compact on md+ */}
        <Link
          href={`/category/${featuredCategorySlug}`}
          className="group flex w-full flex-col justify-between rounded-3xl bg-[#111827] px-6 py-8 text-white shadow-soft md:py-6"
        >
          <div className="flex items-center justify-between">
            <p className="text-xl font-semibold leading-snug md:text-lg">{featuredCategoryName}</p>
            <ArrowUpRight size={18} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          <p className="text-base text-white/60 md:text-sm">Shop the full range</p>
        </Link>

        {/* Trust / feature card */}
        <div className="flex flex-col justify-center gap-4 rounded-3xl bg-[#F8F8F6] p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime-100 p-2">
              <ShieldCheck size={18} className="text-slate-800" />
            </span>
            <p className="text-sm font-medium text-slate-800">Genuine product</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime-100 p-2">
              <Truck size={18} className="text-slate-800" />
            </span>
            <p className="text-sm font-medium text-slate-800">Countrywide delivery</p>
          </div>
        </div>

        {/* Social proof card — placeholder marketing stat, see CLAUDE.md */}
        <div className="flex flex-col justify-between rounded-3xl bg-[#F8F8F6] p-6 shadow-soft">
          <div className="flex -space-x-3">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="h-9 w-9 rounded-full border-2 border-white bg-cream shadow-soft"
                style={{ backgroundColor: swatchColor(["black", "white", "blue", "grey"][i]) }}
              />
            ))}
          </div>
          <div className="mt-4">
            <p className="text-xl font-semibold text-slate-900">5,000+ happy customers</p>
            <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
              4.6 average rating
            </div>
          </div>
        </div>

        {/* More products mini-gallery — spans the full row on md+ instead of being auto-placed
            into a lone 1-of-4 column, which left the rest of the row empty on large screens
            (the 4 cards above it exactly fill a 4-col x 2-row block, so this is always the sole
            item in row 3). Shows more items on wider screens to fill that width usefully. */}
        <div className="rounded-3xl bg-[#F8F8F6] p-6 shadow-soft md:col-span-4">
          <p className="text-sm font-semibold text-slate-800">More Products</p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {moreProducts.slice(0, 6).map((p) => (
              <Link key={p.id} href={`/product/${p.slug}`} className="group relative aspect-square overflow-hidden rounded-2xl bg-white">
                <Image
                  src={p.images[0] ?? "/logo.png"}
                  alt={p.name}
                  fill
                  sizes="(min-width: 640px) 16vw, 30vw"
                  className="object-contain p-2 transition group-hover:scale-105"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
