import esbuild from "esbuild";
import process from "node:process";

const isWatchMode = process.argv.includes("--watch");

const context = await esbuild.context({
  entryPoints: ["main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/state", "@codemirror/view", "@codemirror/language"],
  format: "cjs",
  platform: "node",
  target: "es2022",
  sourcemap: true,
  outfile: "main.js",
  logLevel: "info"
});

if (isWatchMode) {
  await context.watch();
  process.stdout.write("Watching for changes...\n");
} else {
  await context.rebuild();
  await context.dispose();
}
