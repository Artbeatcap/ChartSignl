export interface PublishReelInput {
  videoUrl: string;
  caption: string;
  shareToFeed: boolean;
  coverOffsetMs: number;
}

export interface PublishReelResult {
  publisher: 'postiz' | 'graph';
  id: string;
  permalink?: string;
}

export type ReelPublisher = (input: PublishReelInput) => Promise<PublishReelResult>;

export function configuredPublisherName(): 'postiz' | 'graph' {
  return process.env.REELS_PUBLISHER === 'graph' ? 'graph' : 'postiz';
}

export async function publishViaPostiz(input: PublishReelInput): Promise<PublishReelResult> {
  const base = (process.env.POSTIZ_URL || '').replace(/\/$/, '');
  const apiKey = process.env.POSTIZ_API_KEY || '';
  const integrationId = process.env.POSTIZ_INSTAGRAM_INTEGRATION_ID || '';
  if (!base || !apiKey || !integrationId) {
    throw new Error('Postiz is not configured');
  }

  const response = await fetch(`${base}/api/public/v1/posts`, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'now',
      date: new Date().toISOString(),
      shortLink: false,
      tags: [],
      posts: [
        {
          integration: { id: integrationId },
          value: [
            {
              content: input.caption,
              image: [{ id: input.videoUrl, path: input.videoUrl }],
            },
          ],
          settings: {
            post_type: 'reel',
            share_to_feed: input.shareToFeed,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Postiz publish failed (${response.status}): ${err}`);
  }

  const data = (await response.json()) as { id?: string; posts?: Array<{ postId?: string }> };
  const id = data.id || data.posts?.[0]?.postId || 'postiz';
  return { publisher: 'postiz', id };
}

export async function publishViaGraph(input: PublishReelInput): Promise<PublishReelResult> {
  const igUserId = process.env.IG_USER_ID || '';
  const token = process.env.IG_ACCESS_TOKEN || '';
  if (!igUserId || !token) {
    throw new Error('Instagram Graph is not configured');
  }

  const version = process.env.IG_GRAPH_VERSION || 'v21.0';
  const containerParams = new URLSearchParams({
    media_type: 'REELS',
    video_url: input.videoUrl,
    caption: input.caption,
    share_to_feed: input.shareToFeed ? 'true' : 'false',
    thumb_offset: String(Math.max(0, Math.floor(input.coverOffsetMs / 1000))),
    access_token: token,
  });

  const create = await fetch(
    `https://graph.facebook.com/${version}/${igUserId}/media?${containerParams}`,
    { method: 'POST' }
  );
  if (!create.ok) {
    throw new Error(`Graph container failed (${create.status}): ${await create.text()}`);
  }
  const created = (await create.json()) as { id?: string };
  if (!created.id) throw new Error('Graph container missing id');

  for (let i = 0; i < 20; i += 1) {
    const status = await fetch(
      `https://graph.facebook.com/${version}/${created.id}?fields=status_code&access_token=${encodeURIComponent(token)}`
    );
    const body = (await status.json()) as { status_code?: string };
    if (body.status_code === 'FINISHED') break;
    if (body.status_code === 'ERROR') {
      throw new Error('Graph container processing failed');
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  const publish = await fetch(
    `https://graph.facebook.com/${version}/${igUserId}/media_publish?creation_id=${created.id}&access_token=${encodeURIComponent(token)}`,
    { method: 'POST' }
  );
  if (!publish.ok) {
    throw new Error(`Graph publish failed (${publish.status}): ${await publish.text()}`);
  }
  const posted = (await publish.json()) as { id?: string };
  return { publisher: 'graph', id: posted.id || created.id };
}

export function defaultReelPublisher(): ReelPublisher {
  return configuredPublisherName() === 'graph' ? publishViaGraph : publishViaPostiz;
}
