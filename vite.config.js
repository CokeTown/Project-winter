import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

// 타이틀 하단 버전 표기의 단일 출처 — bump-version.ps1이 package.json만 올리면 따라온다.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// base 경로는 배포 대상에 따라 다르다:
// - GitHub Pages(기본 build): 프로젝트 사이트 하위 경로 /Project-winter/ (2026-07-06 CokeTown 개인 계정 이전 — 레포명 변경)
// - Electron(file:// 로 로드): 반드시 상대경로 './' 이어야 함
// - 로컬 dev/preview: 서버 루트 '/'
export default defineConfig(({ command, mode }) => ({
  base: mode === 'electron' ? './' : command === 'build' ? '/Project-winter/' : '/',
  // __QA_EDITION__: tools/build-qa.ps1이 env로 켠다(#89). 정식 빌드에선 false 상수라 QA 블록이 트리셰이킹된다.
  define: { __APP_VER__: JSON.stringify(pkg.version), __QA_EDITION__: JSON.stringify(process.env.QA_EDITION === '1') },
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
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // Electron(file://)에선 SW 등록이 항상 실패해 에러 로그만 스팸 — 주입 자체를 끈다 (PWA는 웹 전용)
      injectRegister: mode === 'electron' ? null : 'auto',
      // 기존 public/manifest.webmanifest 링크를 그대로 사용 — 플러그인이 manifest를 새로 생성하지 않도록 false.
      manifest: false,
      // 앱 오프라인 셸 프리캐시. **BGM(mp3, 114MB)은 절대 프리캐시하지 않는다** — glob에서 mp3 제외.
      // ogg(sfx ~4MB)는 포함 OK.
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2,ogg,webmanifest}'],
        navigateFallback: 'index.html',
        // 대용량 오디오/모델 등 프리캐시 대상에서 확실히 배제
        globIgnores: ['**/BGM/**', '**/*.mp3'],
        // 개별 파일 크기 상한을 넉넉히 (스크립트/텍스처 대비)
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        runtimeCaching: [
          {
            // BGM(mp3)은 런타임 CacheFirst — 재생 시점에만 캐시.
            urlPattern: /\/BGM\/.*\.mp3$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bgm-audio',
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30일
              },
              // 오디오 range 요청 대응
              rangeRequests: true,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
}));
