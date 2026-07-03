import { defineConfig } from 'vite';

// base 경로는 배포 대상에 따라 다르다:
// - GitHub Pages(기본 build): 프로젝트 사이트 하위 경로 /Project-winter-Rep/
// - Electron(file:// 로 로드): 반드시 상대경로 './' 이어야 함
// - 로컬 dev/preview: 서버 루트 '/'
export default defineConfig(({ command, mode }) => ({
  base: mode === 'electron' ? './' : command === 'build' ? '/Project-winter-Rep/' : '/',
  server: {
    host: true, // 0.0.0.0 바인딩 — 같은 네트워크의 휴대폰에서 접속 가능
    port: process.env.PORT ? Number(process.env.PORT) : 8420,
    strictPort: !!process.env.PORT,
  },
  preview: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 8420,
    strictPort: !!process.env.PORT,
  },
}));
