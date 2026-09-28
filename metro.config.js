// Metro config. Extends Expo defaults with what expo-sqlite needs on web:
// the wa-sqlite WASM asset + the COOP/COEP headers required for SharedArrayBuffer.
// Native (iOS/Android) doesn't need any of this.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  return middleware(req, res, next);
};

module.exports = config;
