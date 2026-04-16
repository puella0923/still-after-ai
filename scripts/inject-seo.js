/**
 * inject-seo.js
 * Expo export 후 dist/index.html에 SEO 태그를 자동 주입하는 스크립트
 * vercel.json buildCommand에서 호출됨
 */
const fs = require('fs');
const path = require('path');

const distIndex = path.join(__dirname, '..', 'dist', 'index.html');

const seoTags = `
    <!-- ① Search Console 소유권 인증 -->
    <meta name="google-site-verification" content="42HCXffGpWRJRMDEoND2Qnu_9lqmGdbwBZygPF_jCvE" />

    <!-- ① Naver 소유권 인증 (네이버 서치어드바이저 등록 후 코드 교체) -->
    <meta name="naver-site-verification" content="0acf48b9c13eb16b92c73d263cbc113e7b9d941e" />

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

let html = fs.readFileSync(distIndex, 'utf-8');

// 이미 주입된 경우 스킵 (naver-site-verification 플레이스홀더 업데이트 시에는 재실행 필요)
if (html.includes('google-site-verification') && !html.includes('NAVER_VERIFICATION_CODE_HERE')) {
  console.log('✅ SEO tags already present, skipping injection.');
  process.exit(0);
}

// <title> 태그 제거 후 SEO 태그 블록을 <head> 바로 다음에 삽입
html = html.replace(/<title>[^<]*<\/title>/, '');
html = html.replace('<head>', '<head>' + seoTags);

fs.writeFileSync(distIndex, html, 'utf-8');
console.log('✅ SEO tags injected into dist/index.html');
