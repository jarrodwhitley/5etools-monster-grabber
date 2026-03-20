import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
    plugins: [crx({ manifest })],
    server: {
        host: 'localhost',
        port: 5173,
        strictPort: true,
        cors: {
            origin: /^chrome-extension:\/\/.*/,
            credentials: true,
        },
    },
    build: {
        sourcemap: true,
    },
});
