import { useEffect, useRef, useState, type ReactNode } from "react";

export type DesktopAspect = "16:10" | "16:9" | "fill";
export function fitDesktop(
  width: number,
  height: number,
  aspect: DesktopAspect,
) {
  if (aspect === "fill") return { width, height };
  const ratio = aspect === "16:10" ? 1.6 : 16 / 9;
  const fittedWidth = Math.min(width, height * ratio);
  return { width: fittedWidth, height: fittedWidth / ratio };
}
export function DesktopFrame({
  aspect,
  children,
}: {
  aspect: DesktopAspect;
  children: ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const fitted = fitDesktop(size.width, size.height, aspect);
  return (
    <div className="min-h-0 flex-1 p-3 pt-0">
      <div
        ref={container}
        className="flex h-full w-full items-center justify-center overflow-hidden"
      >
        <div
          data-testid="desktop-frame"
          data-aspect={aspect}
          style={size.width ? fitted : { width: "100%", height: "100%" }}
          className="relative overflow-hidden rounded-xl bg-[#101112] shadow-xl"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
