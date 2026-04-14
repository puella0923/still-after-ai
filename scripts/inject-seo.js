/**
 * inject-seo.js
 * Expo export 후 두 가지 역할을 수행:
 *   1. dist/index.html (Expo SPA) → SEO 태그 주입 후 dist/app.html 로 저장
 *   2. 프로젝트 루트 index.html (마케팅 랜딩페이지) → dist/index.html 로 복사
 *
 * 결과:
 *   dist/index.html  = 마케팅 랜딩페이지 (stillafter.com 루트에서 제공)
 *   dist/app.html    = Expo SPA         (vercel rewrite로 /Login 등에서 제공)
 */
const fs   = require('fs');
const path = require('path');

const distIndex   = path.join(__dirname, '..', 'dist', 'index.html');
const distApp     = path.join(__dirname, '..', 'dist', 'app.html');
const landingPage = path.join(__dirname, '..', 'index.html'); // 마케팅 랜딩페이지

// ── SEO 태그 블록 (Expo SPA 용) ──────────────────────────────────────────────
const seoTags = `
    <!-- ① Search Console 소유권 인증 -->
    <meta name="google-site-verification" content="42HCXffGpWRJRMDEoND2Qnu_9lqmGdbwBZygPF_jCvE" />

    <!-- ② 기본 메타태그 -->
    <title>Still After — 아직 전하지 못한 말이 있다면</title>
    <meta name="description" content="사랑하는 사람을 떠나보낸 후, 못 다한 말을 전하는 공간. 천천히, 당신의 속도로." />

    <!-- ③ OG 태그 (카카오톡 / SNS 공유 미리보기) -->
    <meta property="og:title" content="Still After — 아직 전하지 못한 말이 있다면" />
    <meta property="og:description" content="사랑하는 사람을 떠나보낸 후, 못 다한 말을 전하는 공간." />
    <meta property="og:image" content="https://stillafter.com/og-image.jpg" />
    <meta property="og:url" content="https://stillafter.com" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="ko_KR" />

    <!-- ④ 트위터 카드 -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Still After — 아직 전하지 못한 말이 있다면" />
    <meta name="twitter:description" content="사랑하는 사람을 떠나보낸 후, 못 다한 말을 전하는 공간." />
    <meta name="twitter:image" content="https://stillafter.com/og-image.jpg" />

    <!-- ⑤ 파비콘 -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />

    <!-- ⑥ GA4 -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-Q4KY5HKLRK"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-Q4KY5HKLRK');
    </script>

    <!-- ⑦ Microsoft Clarity -->
    <script type="text/javascript">
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "wbn3kcnrth");
    </script>`;

// ── Step 1: Expo SPA에 SEO 태그 주입 후 app.html로 저장 ──────────────────────
let spaHtml = fs.readFileSync(distIndex, 'utf-8');

if (spaHtml.includes('google-site-verification')) {
  console.log('⚠️  dist/index.html already has SEO tags (may already be landing page). Skipping SPA injection.');
} else {
  // <title> 태그 제거 후 SEO 태그 블록을 <head> 바로 다음에 삽입
  spaHtml = spaHtml.replace(/<title>[^<]*<\/title>/, '');
  spaHtml = spaHtml.replace('<head>', '<head>' + seoTags);
  fs.writeFileSync(distApp, spaHtml, 'utf-8');
  console.log('✅ SEO tags injected → dist/app.html (Expo SPA)');
}

// ── Step 2: 마케팅 랜딩페이지를 dist/index.html로 복사 ───────────────────────
const landingHtml = fs.readFileSync(landingPage, 'utf-8');
fs.writeFileSync(distIndex, landingHtml, 'utf-8');
console.log('✅ Marketing landing page deployed → dist/index.html');
