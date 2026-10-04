// Builds a static, offline copy of the showcase in dist/: every page, every clinician view,
// the sample outputs and the patient records, with no server and no API key. The pages keep
// calling /api/*; js/static-api.js answers in the browser (see scripts/static/api-shim.js).
//
//   npm run build:static        then serve dist/ from any static host.
//
// `npm run build:static -- --artifact` also writes dist-artifact/, laid out for a claude.ai
// artifact (see the end of this file).
import { build } from "esbuild";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { modules, publicModule } from "../server/modules/index.js";
import { getPatient, DEFAULT_PATIENT_ID } from "../server/patient.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "dist");
const rel = (...p) => path.join(root, ...p);

await rm(out, { recursive: true, force: true });
await cp(rel("public"), out, { recursive: true });

// Vendor libraries, served from the server's /vendor/ routes in the Node app.
await mkdir(path.join(out, "vendor"), { recursive: true });
await cp(rel("node_modules/marked/lib/marked.esm.js"), path.join(out, "vendor/marked.esm.js"));
await cp(rel("node_modules/dompurify/dist/purify.es.mjs"), path.join(out, "vendor/purify.es.js"));
const commonPath = path.join(out, "js/common.js");
const common = (await readFile(commonPath, "utf8"))
  .replace('"/vendor/marked/marked.esm.js"', '"../vendor/marked.esm.js"')
  .replace('"/vendor/dompurify/purify.es.mjs"', '"../vendor/purify.es.js"');
if (!common.includes("../vendor/marked.esm.js") || !common.includes("../vendor/purify.es.js")) {
  throw new Error("Could not rewrite the vendor imports in js/common.js");
}
await writeFile(commonPath, common);

// Sample data the server would return in demo mode.
const patientIds = new Set([DEFAULT_PATIENT_ID, ...modules.map((m) => m.patientId).filter(Boolean)]);
const data = {
  defaultPatientId: DEFAULT_PATIENT_ID,
  modules: modules.map(publicModule),
  patients: Object.fromEntries([...patientIds].map((id) => [id, getPatient(id)])),
  demoOutputs: Object.fromEntries(modules.map((m) => [m.id, m.demoOutput])),
};
await writeFile(path.join(out, "js/static-data.js"), `window.__LK_STATIC = ${JSON.stringify(data)};\n`);
await cp(rel("scripts/static/api-shim.js"), path.join(out, "js/static-api.js"));

// The clinician views' toText/demo/demoFor, bundled for the browser.
const viewIds = modules.filter((m) => m.interactive).map((m) => m.id);
const entry = viewIds.map((id) => `import ${id} from "./server/interactive/${id}.js";`).join("\n")
  + `\nexport default { ${viewIds.join(", ")} };\n`;
await build({
  stdin: { contents: entry, resolveDir: root, sourcefile: "views-entry.js", loader: "js" },
  bundle: true,
  format: "esm",
  minify: true,
  outfile: path.join(out, "js/views.js"),
  plugins: [{
    name: "patient-browser",
    setup(b) {
      b.onResolve({ filter: /\/patient\.js$/ }, () => ({ path: rel("scripts/static/patient-browser.js") }));
    },
  }],
  logLevel: "warning",
});

// Load the offline API before the page's own modules run.
const shimTags = '<script src="js/static-data.js"></script>\n  <script src="js/static-api.js"></script>';
for (const file of (await readdir(out)).filter((f) => f.endsWith(".html"))) {
  const p = path.join(out, file);
  const html = await readFile(p, "utf8");
  if (!html.includes("</head>")) throw new Error(`${file} has no </head>`);
  await writeFile(p, html.replace("</head>", `  ${shimTags}\n</head>`));
}

// A claude.ai artifact wraps its page in its own document skeleton and serves other pages
// as files next to it, so the artifact variant gets the home page body as artifact-page.html
// and a full copy as home.html, which every in-app link to the home page then points at.
if (process.argv.includes("--artifact")) {
  const art = rel("dist-artifact");
  await rm(art, { recursive: true, force: true });
  await cp(out, art, { recursive: true });
  const home = await readFile(path.join(art, "index.html"), "utf8");
  await rm(path.join(art, "index.html"));
  const toHome = (s) => s.replaceAll('href="index.html"', 'href="home.html"').replaceAll('"index.html"', '"home.html"');
  await writeFile(path.join(art, "home.html"), toHome(home));
  for (const file of ["module.html", "dashboard.html", "js/common.js"]) {
    const p = path.join(art, file);
    const before = await readFile(p, "utf8");
    await writeFile(p, toHome(before));
  }
  const headInner = home.match(/<head>([\s\S]*?)<\/head>/)[1]
    .replace(/<meta charset[^>]*>\s*/i, "")
    .replace(/<meta name="viewport"[^>]*>\s*/i, "");
  const title = headInner.match(/<title>[\s\S]*?<\/title>/)[0];
  const bodyInner = home.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];
  await writeFile(
    path.join(art, "artifact-page.html"),
    toHome(`<title>Lakeshore Clinical AI Showcase</title>\n${headInner.replace(title, "").trim()}\n${bodyInner.trim()}\n`),
  );
  console.log("Artifact variant built in dist-artifact/ (page: artifact-page.html).");
}

console.log(`Static showcase built in dist/ (${modules.length} modules, ${viewIds.length} clinician views).`);
