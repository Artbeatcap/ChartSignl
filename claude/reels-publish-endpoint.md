# Reels publish endpoint — Instagram only

Claude (Higgsfield) creates the reel and the caption. ChartSignl only
posts to Instagram when asked. TikTok stays on Higgsfield — see
`claude/reels-runbook.md` §7.

The morning Claude task writes `-post.json` / `-caption.txt` and **does
not post**. `config/posting.json` is `confirm` until **2026-10-07** ET.
`POST /api/reels/publish` without `action: "post"` returns 409 so a
runaway morning pass cannot publish.

## Contract (`lib/publish.js`)

```
GET  /api/reels/mode
GET  /api/reels/code        owner page / JSON (x-reels-owner-secret or ?secret=)
POST /api/reels/publish     header x-reels-code
```

Publish body — caption and video already exist from Claude:

```json
{
  "action": "post",
  "ticker": "COIN",
  "caption": "…from -caption.txt",
  "videoUrl": "https://…/final.mp4",
  "shareToFeed": true,
  "coverOffsetMs": 0
}
```

Confirm mode: Claude pass 2 renders, shows caption and final, waits for
**"post"**. Then it sends the code + `action: "post"`. Auto mode (on/after
Oct 7) still needs the same-day code.

### Owner code page

`GET /api/reels/code?secret=$REELS_OWNER_PAGE_SECRET` — HTML on a phone,
JSON if `Accept: application/json`. One 6-digit code per New York day.

### Publisher modes (`REELS_PUBLISHER`)

- **`postiz`** (default) — self-hosted Postiz on Docker next to n8n is
  free (AGPL). Hosted Postiz cloud is paid. Needs your own free Meta app;
  development mode is enough for your account.
- **`graph`** — Instagram Content Publishing API directly, no Postiz.

Env: `apps/backend/.env.example` (`REELS_*`, `POSTIZ_*`, `IG_*`).
SQL: `supabase/reels_storage.sql`.

Run tests: `npm run test:reels --prefix apps/backend`
