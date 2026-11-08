function pageShell(title: string, inner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — ChartSignl</title>
</head>
<body style="margin:0;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#FAFAF9;color:#57534E;text-align:center;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:40px 32px;box-shadow:0 1px 3px rgba(17,24,39,0.08);">
    <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;color:#14B8A6;margin-bottom:12px;">ChartSignl</div>
    ${inner}
  </div>
</body>
</html>`;
}

export function renderReelsCodePage(input: {
  dayEt: string;
  code: string;
  used: boolean;
  postingMode: 'confirm' | 'auto';
}): string {
  if (input.used) {
    return pageShell(
      'Reel code',
      `<h1 style="font-size:24px;color:#0b1220;margin:0 0 12px;">Today's code is already used</h1>
       <p style="font-size:16px;line-height:1.6;margin:0;">${escapeHtml(input.dayEt)} ET · mode ${escapeHtml(input.postingMode)}</p>
       <p style="font-size:13px;color:#A8A29E;margin:24px 0 0;">One publish per New York day. The next code appears after midnight ET.</p>`
    );
  }

  return pageShell(
    'Reel code',
    `<h1 style="font-size:24px;color:#0b1220;margin:0 0 12px;">Today's publish code</h1>
     <p style="font-size:40px;letter-spacing:0.2em;font-weight:700;color:#0b1220;margin:16px 0;">${escapeHtml(input.code)}</p>
     <p style="font-size:16px;line-height:1.6;margin:0;">${escapeHtml(input.dayEt)} ET · mode ${escapeHtml(input.postingMode)}</p>
     <p style="font-size:13px;color:#A8A29E;margin:24px 0 0;">One-time. Send it as <code>x-reels-code</code>. Morning runs never post while mode is confirm.</p>`
  );
}

export function renderReelsCodeDeniedPage(): string {
  return pageShell(
    'Reel code',
    `<h1 style="font-size:24px;color:#0b1220;margin:0 0 12px;">Not available</h1>
     <p style="font-size:16px;line-height:1.6;margin:0;">This page is owner-only.</p>`
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
