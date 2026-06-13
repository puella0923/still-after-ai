/**
 * inject-seo.js
 * Expo export 후 dist/index.html에 SEO·코스믹 셸 스타일 보강
 */
const fs = require('fs');
const path = require('path');

const distIndex = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(distIndex)) {
  console.error('❌ dist/index.html 없음');
  process.exit(1);
}

const seoTags = `
    <!-- ① Search Console 소유권 인증 -->
    <meta name="google-site-verification" content="42HCXffGpWRJRMDEoND2Qnu_9lqmGdbwBZygPF_jCvE" />

    <!-- ① Naver 소유권 인증 -->
    <meta name="naver-site-verification" content="afa6de24b0e1bd30f9bbe47cdcf45359fae9caee" />

    <!-- ② 기본 메타태그 -->
    <title>Still After — 아직 전하지 못한 말이 있다면</title>
    <meta name="description" content="사랑하는 사람을 떠나보낸 후, 못 다한 말을 전하는 공간. 천천히, 당신의 속도로." />

    <!-- ③ OG 태그 (카카오톡 / SNS 공유 미리보기) -->
    <meta property="og:site_name" content="Still After" />
    <meta property="og:title" content="Still After — 아직 전하지 못한 말이 있다면" />
    <meta property="og:description" content="사랑하는 사람을 떠나보낸 후, 못 다한 말을 전하는 공간." />
    <meta property="og:image" content="https://stillafter.com/og-image-v2.jpg" />
    <meta property="og:image:secure_url" content="https://stillafter.com/og-image-v2.jpg" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Still After — 아직 전하지 못한 말이 있다면" />
    <meta property="og:url" content="https://stillafter.com" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="ko_KR" />

    <!-- ④ 트위터 카드 -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Still After — 아직 전하지 못한 말이 있다면" />
    <meta name="twitter:description" content="사랑하는 사람을 떠나보낸 후, 못 다한 말을 전하는 공간." />
    <meta name="twitter:image" content="https://stillafter.com/og-image-v2.jpg" />

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

const cosmicShellCss = `
    <style id="cosmic-shell">
      html, body { background: #0a0118; color: #F3E8FF; }
      #root { background: #0a0118; }
    </style>`;

const mobileReadabilityCss = `
    <style id="mobile-readability">
      html { -webkit-text-size-adjust: 100%; }
      body { word-break: keep-all; overflow-wrap: break-word; }
    </style>`;

let html = fs.readFileSync(distIndex, 'utf-8');

if (!html.includes('google-site-verification')) {
  html = html.replace(/<title>[^<]*<\/title>/, '');
  html = html.replace('<head>', '<head>' + seoTags);
  console.log('✅ SEO tags injected into dist/index.html');
} else if (!html.includes('naver-site-verification')) {
  html = html.replace('<head>', '<head>' + `
    <meta name="naver-site-verification" content="afa6de24b0e1bd30f9bbe47cdcf45359fae9caee" />`);
  console.log('✅ Naver verification tag injected.');
}

if (!html.includes('cosmic-shell')) {
  html = html.replace('</head>', cosmicShellCss + '\n  </head>');
  console.log('✅ Cosmic shell CSS injected.');
}

if (!html.includes('mobile-readability')) {
  html = html.replace('</head>', mobileReadabilityCss + '\n  </head>');
  console.log('✅ Mobile readability CSS injected.');
}

html = html.replace(/og-image\.jpg/g, 'og-image-v2.jpg');

fs.writeFileSync(distIndex, html, 'utf-8');
console.log('✅ dist/index.html ready.');
