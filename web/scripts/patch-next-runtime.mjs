import fs from 'node:fs';
import path from 'node:path';

const runtimePath = path.join(process.cwd(), '.next', 'server', 'webpack-runtime.js');

try {
  let js = fs.readFileSync(runtimePath, 'utf8');
  const before = js;
  js = js.replace(
    /__webpack_require__\.u = \(chunkId\) => \{[\s\S]*?return \"\" \+ chunkId \+ \.js\";[\s\S]*?\};/,
    (m) => m.replace(/return \"\" \+ chunkId \+ \.js\";/, 'return "chunks/" + chunkId + ".js";')
  );
  if (js !== before) {
    fs.writeFileSync(runtimePath, js, 'utf8');
    console.log('[patch-next-runtime] Patched webpack-runtime chunk path to chunks/*.js');
  } else {
    console.log('[patch-next-runtime] No changes needed');
  }
} catch (e) {
  console.error('[patch-next-runtime] Failed:', e?.message || e);
  process.exitCode = 0; // don't fail build
}

