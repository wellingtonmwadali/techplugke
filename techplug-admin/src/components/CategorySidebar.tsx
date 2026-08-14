import Link from "next/link";
import {
  Smartphone,
  Laptop,
  Tv,
  Headphones,
  Gamepad2,
  Camera,
  Home,
  Watch,
  Cable,
  Refrigerator,
  Sparkle,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { sidebarCategories } from "@/lib/data";

const icons: Record<string, LucideIcon> = {
  Smartphone,
  Laptop,
  Tv,
  Headphones,
  Gamepad2,
  Camera,
  Home,
  Watch,
  Cable,
  Refrigerator,
  Sparkle,
  Tag,
};

export default function CategorySidebar() {
  return (
    <nav aria-label="Shop by category" className="rounded-lg border border-line bg-white">
      <ul>
        {sidebarCategories.map((category) => {
          const Icon = icons[category.icon];
          return (
            <li key={category.slug} className="border-b border-line last:border-b-0">
              <Link
                href={`/category/${category.slug}`}
                className="flex items-center gap-3 px-4 py-3 text-sm text-ink hover:bg-cream transition-colors"
              >
                <Icon size={18} className="shrink-0 text-ink/60" />
                {category.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
