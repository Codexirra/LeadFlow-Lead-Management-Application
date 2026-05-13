import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiProxyTarget = env.VITE_API_PROXY_TARGET;

  const baseConfig = {
    plugins: [react()]
  };

  if (!apiProxyTarget) {
    return baseConfig;
  }

  const proxyConfig = {
    '/api': {
      target: apiProxyTarget,
      changeOrigin: true
    }
  };

  return {
    ...baseConfig,
    server: {
      proxy: proxyConfig
    },
    preview: {
      proxy: proxyConfig
    }
  };
});
