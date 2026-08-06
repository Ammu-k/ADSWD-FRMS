// registry.js - Cross-feature API bus. Feature modules self-register here
// so they can call each other without circular imports.
// All modules are loaded by main.js before init() runs, so the registry is
// fully populated by the time any UI function executes.

export const api = {};
