// Builds the small public website BeautyLink needs before the full app goes on the web:
// a home page, the privacy policy and the terms of use, from the same text the app shows
// (src/constants/legal.ts), so the two never drift apart.
//
//   node scripts/build-legal-site.mjs        → writes dist-legal/
//   npx eas-cli deploy --export-dir dist-legal --prod
//
// Pages: /  /privacy/  /terms/
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CONTACT_EMAIL,
  LEGAL_UPDATED,
  PRIVACY_POLICY,
  TERMS_OF_USE,
} from '../src/constants/legal.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist-legal');

const escape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const contact = CONTACT_EMAIL
  ? `לשאלות ובקשות: <a href="mailto:${escape(CONTACT_EMAIL)}">${escape(CONTACT_EMAIL)}</a>`
  : 'כתובת המייל של BeautyLink לשאלות ובקשות תפורסם כאן בקרוב.';

function page(title, body, depth) {
  const up = depth ? '../' : '';
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title === 'BeautyLink' ? 'BeautyLink' : `${escape(title)} · BeautyLink`}</title>
<link rel="icon" href="${up}favicon.png">
<style>
  :root { --bg: #FFF6F7; --ink: #1A1416; --muted: #76676D; --accent: #B5506F; --border: #F2D6DF; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink);
         font-family: "Rubik", "Segoe UI", Arial, sans-serif; line-height: 1.7; }
  main { max-width: 720px; margin: 0 auto; padding: 32px 20px 64px; }
  header { text-align: center; margin-bottom: 28px; }
  header img { width: 120px; height: 120px; }
  h1 { font-size: 28px; margin: 12px 0 4px; }
  h2 { font-size: 19px; margin: 28px 0 6px; }
  p { margin: 0 0 10px; }
  .muted { color: var(--muted); font-size: 14px; }
  a { color: var(--accent); }
  nav { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-top: 20px; }
  footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--border);
           text-align: center; font-size: 14px; color: var(--muted); }
</style>
</head>
<body>
<main>
<header>
  <a href="${up || './'}"><img src="${up}logo.png" alt="BeautyLink"></a>
</header>
${body}
<footer>
  <a href="${up}privacy/">מדיניות פרטיות</a> · <a href="${up}terms/">תנאי שימוש</a><br>
  © BeautyLink
</footer>
</main>
</body>
</html>
`;
}

function documentPage(title, sections) {
  const parts = sections
    .map(
      (s, i) =>
        `<h2>${i + 1}. ${escape(s.title)}</h2>\n` +
        s.paragraphs.map((p) => `<p>${escape(p)}</p>`).join('\n'),
    )
    .join('\n');
  return page(
    title,
    `<h1>${escape(title)}</h1>
<p class="muted">עודכן לאחרונה: ${escape(LEGAL_UPDATED)}</p>
${parts}
<h2>יצירת קשר</h2>
<p>${contact}</p>`,
    1,
  );
}

const home = page(
  'BeautyLink',
  `<h1 style="text-align:center">BeautyLink</h1>
<p style="text-align:center">האפליקציה שמחברת בין לקוחות לבעלות מקצוע בתחום היופי והטיפוח: מחפשות בעלת מקצוע, רואות עבודות ומחירים, וקובעות תור בכמה לחיצות.</p>
<p class="muted" style="text-align:center">האפליקציה תהיה זמינה בקרוב ב-Google Play וב-App Store.</p>
<nav><a href="privacy/">מדיניות פרטיות</a><a href="terms/">תנאי שימוש</a></nav>`,
  0,
);

rmSync(out, { recursive: true, force: true });
for (const [path, html] of [
  ['index.html', home],
  ['privacy/index.html', documentPage('מדיניות פרטיות', PRIVACY_POLICY)],
  ['terms/index.html', documentPage('תנאי שימוש', TERMS_OF_USE)],
]) {
  const file = join(out, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}
copyFileSync(join(root, 'assets/images/logo.png'), join(out, 'logo.png'));
copyFileSync(join(root, 'assets/images/favicon.png'), join(out, 'favicon.png'));
console.log('Built', out);
