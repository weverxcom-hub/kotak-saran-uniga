import { Heart } from "lucide-react";
import { SITE_CONFIG } from "@/lib/site-config";
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
              © {year} {SITE_CONFIG.universityName}
            </p>
            <p>
              Kotak Saran Elektronik tingkat universitas · data tetap tercatat
              pada sistem terpusat {SITE_CONFIG.universityShort}.
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
