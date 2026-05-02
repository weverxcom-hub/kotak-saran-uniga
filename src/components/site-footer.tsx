import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function SiteFooter({
  className,
  variant = "full",
}: {
  className?: string;
  variant?: "full" | "compact";
}) {
  const year = new Date().getFullYear();
  return (
    <footer
      className={cn(
        "border-t border-border/60 bg-card/40 py-6 text-center text-xs text-muted-foreground",
        className,
      )}
    >
      <div className="container space-y-1.5">
        {variant === "full" ? (
          <>
            <p>
              © {year} Fakultas Ekonomi dan Bisnis · Universitas Gajayana
              Malang
            </p>
            <p>
              Versi modern dari Kotak Saran Elektronik resmi · data tetap
              tercatat pada sistem terpusat FEB.
            </p>
          </>
        ) : null}
        <p className="flex items-center justify-center gap-1.5">
          <span>Develop with</span>
          <Heart
            className="h-3.5 w-3.5 fill-rose-500 text-rose-500"
            aria-label="love"
          />
          <span>by</span>
          <a
            href="https://weverx.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground/80 underline-offset-2 transition hover:text-primary hover:underline"
          >
            weverx.com
          </a>
        </p>
      </div>
    </footer>
  );
}
