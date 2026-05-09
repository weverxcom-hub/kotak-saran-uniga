import Image from "next/image";
import { SITE_CONFIG } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * Logo holder bergaya UNIGA: lingkaran putih dengan ring tipis warna emas,
 * mengikuti gaya identitas resmi Universitas Gajayana (segel di atas dasar
 * biru navy). Bentuk circular dipilih supaya senada dengan logo segel UNIGA.
 */
export function BrandMark({
  className,
  size = 44,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-2 ring-accent/70",
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={SITE_CONFIG.universityName}
    >
      <Image
        src={SITE_CONFIG.logoPath}
        alt={SITE_CONFIG.logoAlt}
        width={size}
        height={size}
        priority
        sizes={`${size}px`}
        className="h-[88%] w-[88%] object-contain"
      />
    </div>
  );
}
