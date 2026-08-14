import Image from "next/image";
import Link from "next/link";
import { Category } from "@/lib/types";

export default function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-3xl bg-white p-0 shadow-soft transition hover:shadow-lg"
    >
      {/* Full-bleed image — fills the top, left, and right edges of the card */}
      <div className="relative h-[80%] w-full overflow-hidden">
        <Image
          src={category.image}
          alt={category.name}
          fill
          className="h-full w-full rounded-t-3xl object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(min-width: 1024px) 16vw, 45vw"
        />
      </div>

      {/* Title bar — bottom 20% of the card */}
      <div className="flex h-[20%] items-center justify-center bg-white py-3 text-center text-sm font-bold uppercase tracking-wider text-slate-900">
        {category.name}
      </div>
    </Link>
  );
}
