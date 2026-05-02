import Image from "next/image";
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
      aria-label="Universitas Gajayana Malang"
    >
      <Image
        src="/img/uniga-logo.png"
        alt="Logo Universitas Gajayana Malang"
        width={size}
        height={size}
        priority
        sizes={`${size}px`}
        className="h-[88%] w-[88%] object-contain"
      />
    </div>
  );
}
