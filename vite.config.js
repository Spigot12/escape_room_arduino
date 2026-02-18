import {defineConfig} from 'vite';
import path from 'path';

export default defineConfig({
    root: path.resolve(__dirname, 'src'),
    build: {
        outDir: path.resolve(__dirname, 'dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'src/pages/index.html'),
                level1: path.resolve(__dirname, 'src/pages/level1.html'),
                level2: path.resolve(__dirname, 'src/pages/level2.html'),
                level3: path.resolve(__dirname, 'src/pages/level3.html'),
            },
            external: []
        }
    },
    server: {
        open: '/pages/index.html',
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://localhost:3000',
                ws: true,
            },
        },
    },
});
