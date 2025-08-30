import fs from 'node:fs';
import path from 'node:path';

const runtimePath = path.join(process.cwd(), '.next', 'server', 'webpack-runtime.js');

function patchOnce() {
  try {
    if (!fs.existsSync(runtimePath)) return false;
    let js = fs.readFileSync(runtimePath, 'utf8');
    const before = js;
    js = js.replace(
      /__webpack_require__\.u = \(chunkId\) => \{[\s\S]*?return \"\" \+ chunkId \+ \.js\";[\s\S]*?\};/,
      (m) => m.replace(/return \"\" \+ chunkId \+ \.js\";/, 'return "chunks/" + chunkId + ".js";')
    );
    if (js !== before) {
      fs.writeFileSync(runtimePath, js, 'utf8');
      console.log('[dev-runtime-patch] Patched webpack-runtime chunk path to chunks/*.js');
    }
    return true;
  } catch (e) {
    console.log('[dev-runtime-patch] Error:', e?.message || e);
    return false;
  }
}

// Poll + watch (Next dev may rewrite the file)
let patched = false;
const interval = setInterval(() => {
  const ok = patchOnce();
  if (ok && !patched) {
    patched = true;
    try {
      fs.watch(path.dirname(runtimePath), { recursive: false }, (evt, filename) => {
        if (filename === path.basename(runtimePath)) {
          // Re-apply if overwritten
          setTimeout(patchOnce, 50);
        }
      });
      console.log('[dev-runtime-patch] Watching for runtime changes…');
    } catch {}
  }
}, 500);

process.on('SIGINT', () => { clearInterval(interval); process.exit(0); });
process.on('SIGTERM', () => { clearInterval(interval); process.exit(0); });

