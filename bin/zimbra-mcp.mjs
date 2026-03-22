#!/usr/bin/env node
/**
 * CLI shim: shebang lives here only. dist/index.js is pure ESM (no #!)
 * so Node does not throw SyntaxError on `#!/` when loading the bundle as a module.
 */
import "../dist/index.js";
