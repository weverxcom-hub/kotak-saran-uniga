import Image from "next/image";
import { SITE_CONFIG } from "@/lib/site-config";
import { cn } from "@/lib/utils";

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
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border/60",
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
