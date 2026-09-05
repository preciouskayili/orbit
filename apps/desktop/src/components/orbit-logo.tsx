import mark from "@/assets/brand/orbit-mark.svg";
import appIcon from "@/assets/brand/orbit-app.svg";

export function OrbitLogo({
  variant = "mark",
  className = "h-6 w-auto",
  decorative = false,
}: {
  variant?: "mark" | "app";
  className?: string;
  decorative?: boolean;
}) {
  return (
    <img
      src={variant === "mark" ? mark : appIcon}
      alt={decorative ? "" : "Orbit"}
      aria-hidden={decorative || undefined}
      className={className}
      draggable={false}
    />
  );
}
