import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  const alignment =
    align === "center" ? "items-center text-center" : "items-start text-left";

  return (
    <div className={cn("flex flex-col gap-3", alignment, className)}>
      {eyebrow ? (
        <Badge variant="outline" className="w-fit bg-white/82">
          {eyebrow}
        </Badge>
      ) : null}
      <div className="space-y-3">
        <h2 className="font-display text-balance text-3xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-4xl">
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              "max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg",
              align === "center" ? "mx-auto" : "",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
