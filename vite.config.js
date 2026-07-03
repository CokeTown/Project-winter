import { defineConfig } from 'vite';

// GitHub Pages 프로젝트 사이트는 /Project-winter-Rep/ 하위 경로로 서빙되므로
// 빌드시에만 base를 맞추고, 로컬 dev/preview에서는 루트('/')를 그대로 사용한다.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Project-winter-Rep/' : '/',
  server: {
    host: true, // 0.0.0.0 바인딩 — 같은 네트워크의 휴대폰에서 접속 가능
    port: 8420,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 8420,
    strictPort: true,
  },
}));
