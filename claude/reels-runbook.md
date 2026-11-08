# TikTok via Higgsfield — not ChartSignl

Claude posts TikTok. ChartSignl does not. TikTok's posting API requires
the *app* to pass TikTok's audit; Higgsfield's has, a self-hosted Postiz
app has not (private-only).

Standing choices (every publish unless the owner changes them):

- Visibility: public
- Comments / duet / stitch: on
- Flag as AI: **off**, unless a cloned voice or generated footage is used

Exact tool sequence:

1. **Connect once.** If no TikTok account is connected on Higgsfield,
   generate the authorize link, wait for approval on TikTok, then
   continue. Skip this on later mornings.
2. **Upload** the final MP4 to Higgsfield hosting.
3. **Prepare** the TikTok post (caption from Claude's `-caption.txt`,
   cover = hook frame / frame 0).
4. **Publish** with the standing choices above.
5. **Poll** until live. Report the public link.

Do not run steps 2–5 while posting mode is `confirm`. Morning Claude
stops after the final and caption. Instagram posting, when you say
"post", is `POST /api/reels/publish` on ChartSignl.
