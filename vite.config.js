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
                leaderboard: path.resolve(__dirname, 'src/pages/leaderboard.html'),
                level1: path.resolve(__dirname, 'src/pages/level1.html'),
                level2: path.resolve(__dirname, 'src/pages/level2.html'),
                level3: path.resolve(__dirname, 'src/pages/level3.html'),
                level4: path.resolve(__dirname, 'src/pages/level4.html'),
                level5: path.resolve(__dirname, 'src/pages/level5.html'),
                level6: path.resolve(__dirname, 'src/pages/level6.html'),
                level7: path.resolve(__dirname, 'src/pages/level7.html'),
                level8: path.resolve(__dirname, 'src/pages/level8.html'),
                map: path.resolve(__dirname, 'src/pages/map.html'),
            },
            external: [
                '/socket.io/socket.io.js',
            ],
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
