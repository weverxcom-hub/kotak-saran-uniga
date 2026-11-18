import Link from "next/link";
import { useTranslations } from "next-intl";
import { SITE_CONFIG } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export function SiteFooter({
  className,
  variant = "full",
}: {
  className?: string;
  variant?: "full" | "compact";
}) {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();
  return (
    <footer
      className={cn("border-t border-border bg-muted/40 text-sm text-muted-foreground", className)}
    >
      <div className="container max-w-5xl py-8">
        {variant === "full" ? (
          <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
            <div>
              <p className="font-semibold text-foreground">{SITE_CONFIG.universityName}</p>
              <p className="mt-1 max-w-md">
                {t("site", {
                  site: SITE_CONFIG.siteName,
                  university: SITE_CONFIG.universityName,
                })}
              </p>
            </div>
            <div className="space-y-1.5">
              <p>{t("contact")}:</p>
              <a
                href={`mailto:${SITE_CONFIG.contactEmail}`}
                className="block font-medium text-foreground underline-offset-4 hover:underline"
              >
                {SITE_CONFIG.contactEmail}
              </a>
              <Link
                href="/report/login"
                className="block underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("admin")}
              </Link>
            </div>
          </div>
        ) : null}
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 text-xs",
            variant === "full" && "mt-8 border-t border-border pt-4",
          )}
        >
          <span>
            © {year} {SITE_CONFIG.universityName}
          </span>
          <span>
            {t("credit")}{" "}
            <a
              href="https://weverx.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              weverx.com
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
