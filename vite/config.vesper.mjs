import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    build: {
        outDir: 'dist/vesper',
        rollupOptions: {
            input: fileURLToPath(new URL('../vesper.html', import.meta.url)),
        },
    },
});
