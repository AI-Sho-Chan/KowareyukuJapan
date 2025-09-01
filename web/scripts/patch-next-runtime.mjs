import fs from 'node:fs';
import path from 'node:path';

// Patch Next.js runtime chunk path to `chunks/*.js` and map vendor chunk for next.js
const runtimePath = path.join(process.cwd(), '.next', 'server', 'webpack-runtime.js');

try {
  if (!fs.existsSync(runtimePath)) {
    console.log('[patch-next-runtime] Runtime not found, skipping');
    process.exit(0);
  }

  let js = fs.readFileSync(runtimePath, 'utf8');
  const before = js;

  // Pattern 1: verbose function body
  js = js.replace(
    /__webpack_require__\.u = \(chunkId\) => \{[\s\S]*?return \"\" \+ chunkId \+ \"\.js\";[\s\S]*?\};/,
    (m) => m.replace(/return \"\" \+ chunkId \+ \"\.js\";/, 'return "chunks/" + chunkId + ".js";')
  );
  // Pattern 2: compact one-liner body
  js = js.replace(
    /(__webpack_require__\.u\s*=\s*\(chunkId\)\s*=>\s*\{\s*\n?\s*)return\s+""\s*\+\s*chunkId\s*\+\s*"\.js";\s*\n?\s*\}/,
    '$1return "chunks/" + chunkId + ".js";\n}'
  );

  // Add vendor mapping for next.js if absent
  if (!js.includes('vendor-chunks/next.js')) {
    js += `
;try{(function(){
  var _oldU = __webpack_require__.u;
  __webpack_require__.u = function(chunkId){
    if (chunkId === 5611) return "vendor-chunks/next.js";
    try { return "chunks/" + chunkId + ".js"; } catch { return _oldU ? _oldU(chunkId) : (""+chunkId+".js"); }
  };
})();}catch(_e){}
`;
  }

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

