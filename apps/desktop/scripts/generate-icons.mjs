import { Resvg } from "@resvg/resvg-js";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = await readFile(
  path.join(root, "src/assets/brand/orbit-app.svg"),
  "utf8",
);
const output = path.join(root, "resources/icons");
await mkdir(output, { recursive: true });
const rendered = new Map();
const png = (size) => {
  if (!rendered.has(size))
    rendered.set(
      size,
      new Resvg(source, { fitTo: { mode: "width", value: size } })
        .render()
        .asPng(),
    );
  return rendered.get(size);
};
await writeFile(path.join(output, "orbit.png"), png(512));
await writeFile(path.join(output, "orbit@2x.png"), png(1024));

// Native macOS tooling preserves all standard + Retina representations. The
// generated ICNS is ready for the future app-packaging configuration.
if (process.platform === "darwin") {
  const temporary = await mkdtemp(path.join(tmpdir(), "orbit-icons-"));
  try {
    const iconset = path.join(temporary, "Orbit.iconset");
    await mkdir(iconset);
    for (const size of [16, 32, 128, 256, 512]) {
      await writeFile(
        path.join(iconset, `icon_${size}x${size}.png`),
        png(size),
      );
      await writeFile(
        path.join(iconset, `icon_${size}x${size}@2x.png`),
        png(size * 2),
      );
    }
    execFileSync("iconutil", [
      "-c",
      "icns",
      iconset,
      "-o",
      path.join(output, "orbit.icns"),
    ]);
  } finally {
    // This directory is created above and contains only generated icon variants.
    await rm(temporary, { recursive: true, force: true });
  }
}
console.log("Generated Orbit native icons from src/assets/brand/orbit-app.svg");
