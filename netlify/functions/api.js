// Thin wrapper — the real code is in _api-bundle.js
const bundle = require("./_api-bundle.js");
exports.handler = bundle.handler || (bundle.default && bundle.default.handler);
