import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(root, '..');

function stripModule(src) {
  return src
    .replace(/^\s*import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s+/gm, '');
}

const prelude = [
  '/* __TRANSCRIPT_LIB__ */',
  stripModule(readFileSync(join(root, 'lib/vtt.js'), 'utf8')),
  stripModule(readFileSync(join(root, 'lib/feeds.js'), 'utf8')),
  stripModule(readFileSync(join(root, 'lib/run.js'), 'utf8')),
].join('\n');

const nodes = [];
const connections = {};
let x = 0;
let y = 0;

function add(name, type, typeVersion, parameters, extra = {}) {
  nodes.push({
    parameters,
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name,
    type,
    typeVersion,
    position: [x, y],
    ...extra,
  });
  x += 240;
  return name;
}

function link(from, to, output = 0) {
  const bucket = connections[from] || (connections[from] = { main: [] });
  while (bucket.main.length <= output) bucket.main.push([]);
  bucket.main[output].push({ node: to, type: 'main', index: 0 });
}

function code(name, mode, body) {
  return add(name, 'n8n-nodes-base.code', 2, {
    mode,
    jsCode: `${prelude}\n${body}`,
  });
}

function iff(name, expression) {
  return add(name, 'n8n-nodes-base.if', 1, {
    conditions: {
      boolean: [{ value1: expression || `={{$json.${nameFlag(name)}}}`, value2: true }],
    },
  });
}

function nameFlag(name) {
  const flags = {
    'YouTube source?': 'isYouTube',
    'Needs channel id?': 'needsResolve',
    'Cache hit?': 'cacheHit',
    'Channel id ok?': 'resolveOk',
    'YouTube items?': 'hasParsed',
    'RSS ready?': 'rssReady',
    'Podcast ready?': 'podcastReady',
    'Podcast items?': 'hasParsed',
    'Anything to save?': 'hasWork',
    'Need folder?': 'needFolder',
    'Already decided?': 'isDecided',
    'YouTube item?': 'isYouTubeItem',
    'Fetch transcript?': 'shouldFetch',
    'Primary is Supadata?': 'useSupadataPrimary',
    'Need secondary?': 'needsSecondary',
    'Secondary is Supadata?': 'useSupadataSecondary',
    'Need yt-dlp?': 'needsYtdlp',
    'Podcast has VTT?': 'hasTranscriptUrl',
    'Write doc?': 'pendingDrive',
    'Persist row?': 'persist',
    'Has failures?': 'hasFailures',
    'Used credits?': 'hasCredits',
    'Send credit warning?': 'sendWarning',
    'Claimed warning?': 'sendWarning',
    'Doc created?': 'hasCreatedId',
    'Run ok?': 'runOk',
    'Has stale rows?': 'hasStale',
  };
  const flag = flags[name];
  if (!flag) throw new Error(`no flag for ${name}`);
  return flag;
}

const pg = {
  credentials: {
    postgres: { id: 'REPLACE_TRANSCRIPTS_PG_CREDENTIAL_ID', name: 'transcripts_n8n' },
  },
};
const slackCred = {
  credentials: {
    slackApi: { id: 'REPLACE_SLACK_CREDENTIAL_ID', name: 'Slack Bot' },
  },
};
const youtubeCred = {
  credentials: {
    httpQueryAuth: { id: 'REPLACE_YOUTUBE_DATA_API_CREDENTIAL_ID', name: 'YouTube Data API Key' },
  },
};
const supadataCred = {
  credentials: {
    httpHeaderAuth: { id: 'REPLACE_SUPADATA_CREDENTIAL_ID', name: 'Supadata API Key' },
  },
};
const transcriptCred = {
  credentials: {
    httpHeaderAuth: { id: 'REPLACE_TRANSCRIPTAPI_CREDENTIAL_ID', name: 'TranscriptAPI Bearer' },
  },
};
const driveCred = {
  credentials: {
    googleDriveOAuth2Api: { id: 'REPLACE_GOOGLE_DRIVE_CREDENTIAL_ID', name: 'Google Drive' },
  },
};

function responseOptions(format) {
  const response = { fullResponse: true, neverError: true };
  if (format) response.responseFormat = format;
  return { response: { response } };
}

function http(name, parameters, extra = {}) {
  return add(name, 'n8n-nodes-base.httpRequest', 4.2, parameters, {
    onError: 'continueErrorOutput',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 3000,
    ...extra,
  });
}

function postgres(name, query) {
  return add(name, 'n8n-nodes-base.postgres', 2.5, {
    operation: 'executeQuery',
    query,
    options: {},
  }, pg);
}

function headerAuth(cred) {
  return {
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    ...cred,
  };
}

function queryAuth() {
  return {
    authentication: 'genericCredentialType',
    genericAuthType: 'httpQueryAuth',
    ...youtubeCred,
  };
}

function driveAuth() {
  return {
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'googleDriveOAuth2Api',
    ...driveCred,
  };
}

add('Manual run', 'n8n-nodes-base.manualTrigger', 1, {});
y = 160;
x = 0;
add('Weekday and Sunday schedule', 'n8n-nodes-base.scheduleTrigger', 1.2, {
  rule: {
    interval: [
      { field: 'cronExpression', expression: '10 6 * * 1-5' },
      { field: 'cronExpression', expression: '40 20 * * 1-5' },
      { field: 'cronExpression', expression: '40 16 * * 0' },
    ],
  },
});

x = 240;
y = 80;
code('Assert config', 'runOnceForAllItems', `
const wfTz = ($workflow.settings && $workflow.settings.timezone) || '';
const varTz = $vars.TRANSCRIPT_TIMEZONE || '';
const tz = varTz || wfTz;
assertTranscriptTimezone(tz);
if (wfTz && wfTz !== EXPECTED_TIMEZONE) {
  throw new Error('timezone mismatch: workflow settings are ' + wfTz);
}
const order = providerOrder($vars.TRANSCRIPT_PROVIDER || 'supadata');
const limitRaw = Number($vars.MONTHLY_TRANSCRIPT_LIMIT || 100);
const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 100;
const channel = $vars.SLACK_ALERT_CHANNEL;
const healthUrl = String($vars.HEALTHCHECK_TRANSCRIPTS_URL || '').replace(/\\/$/, '');
if (!healthUrl) throw new Error('HEALTHCHECK_TRANSCRIPTS_URL missing');
if (!channel) throw new Error('SLACK_ALERT_CHANNEL missing');
return [{ json: {
  timezone: tz,
  primary: order.primary,
  secondary: order.secondary,
  limit: limit,
  channel: channel,
  healthUrl: healthUrl,
  executionId: String($execution.id),
} }];
`);

add('Check yt-dlp version', 'n8n-nodes-base.executeCommand', 1, {
  command: 'yt-dlp --version',
});

code('Require pinned yt-dlp', 'runOnceForAllItems', `
const cfg = $('Assert config').first().json;
const stdout = String(($input.first().json && $input.first().json.stdout) || '').trim();
if (stdout !== YT_DLP_VERSION) {
  throw new Error('yt-dlp version mismatch: expected ' + YT_DLP_VERSION + ', got ' + (stdout || '(none)'));
}
return [{ json: cfg }];
`);

postgres('Sweep stale runs', '={{ $json.staleSql }}');
code('Attach stale sweep', 'runOnceForAllItems', `
const cfg = $('Require pinned yt-dlp').first().json;
return [{ json: { ...cfg, staleSql: staleSweepQuery() } }];
`);

// The sweep node above references staleSql from the previous code, so reorder by rewiring:
// Attach stale sweep must run BEFORE Sweep stale runs. Fix connections below; node order in the
// array does not affect execution.

code('Note stale', 'runOnceForAllItems', `
const cfg = $('Attach stale sweep').first().json;
const staleIds = $input.first().json.stale_ids || [];
const staleFailures = (Array.isArray(staleIds) ? staleIds : []).map((id) => ({
  source: 'transcript_runs',
  title: 'stale running row',
  attempts: [{ method: 'stale_sweep', error: 'stale running row (likely crash) ' + id }],
}));
return [{ json: { ...cfg, staleFailures, hasStale: staleFailures.length > 0, insertSql: insertRunQuery(cfg.executionId) } }];
`);

postgres('Insert run', "={{ $('Note stale').first().json.insertSql }}");

add('Read sources', 'n8n-nodes-base.executeCommand', 1, {
  command: 'node /opt/transcripts/bin/cli.mjs read-sources',
});

code('Parse sources', 'runOnceForAllItems', `
const cfg = $('Note stale').first().json;
const runId = $('Insert run').first().json.id;
if (!runId) throw new Error('transcript_runs insert returned no id');
const stdout = String(($input.first().json && $input.first().json.stdout) || '');
let sources;
try { sources = JSON.parse(stdout); }
catch (error) { throw new Error('sources.json unreadable: ' + error.message); }
if (!Array.isArray(sources) || !sources.length) throw new Error('sources.json is empty');
return [{ json: { ...cfg, runId: runId, sources: sources } }];
`);

code('Fan out sources', 'runOnceForAllItems', `
const cfg = $input.first().json;
return cfg.sources.map((source) => ({
  json: {
    runId: cfg.runId,
    primary: cfg.primary,
    secondary: cfg.secondary,
    limit: cfg.limit,
    channel: cfg.channel,
    healthUrl: cfg.healthUrl,
    source: source,
  },
}));
`);

add('Split sources', 'n8n-nodes-base.splitInBatches', 3, { batchSize: 1, options: {} });

code('Source context', 'runOnceForEachItem', `
const source = $json.source || {};
const isYouTube = source.type === 'youtube_channel';
const isPodcast = source.type === 'podcast_rss';
if (!isYouTube && !isPodcast) {
  return { json: { directCollect: true, isYouTube: false, items: [], failures: [sourceFailure(source, 'sources', 'unknown source type ' + source.type)] } };
}
const handle = String(source.handle || '').replace(/^@/, '');
return { json: {
  ...$json,
  isYouTube: isYouTube,
  isPodcast: isPodcast,
  handle: handle,
  needsResolve: isYouTube && !source.channel_id,
  channelId: source.channel_id || '',
} };
`);

iff('YouTube source?');
iff('Needs channel id?');

postgres('Lookup channel cache', "={{ $json.cacheSql }}");
code('Prepare cache lookup', 'runOnceForEachItem', `
return { json: { ...$json, cacheSql: cacheLookupQuery($json.source.slug) } };
`);

code('Apply cache', 'runOnceForEachItem', `
const prev = $('Prepare cache lookup').item.json;
const channelId = String($json.channel_id || '');
if (channelId) return { json: { ...prev, channelId: channelId, cacheHit: true } };
return { json: { ...prev, cacheHit: false } };
`);

iff('Cache hit?');

http('Resolve handle', {
  method: 'GET',
  url: "={{ 'https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=' + encodeURIComponent($json.handle) }}",
  ...queryAuth(),
  options: responseOptions('json'),
});

code('Apply channel id', 'runOnceForEachItem', `
const prev = $('Apply cache').item.json;
let channelId = '';
let error = '';
try {
  if ($json.error) throw new Error(httpErrorText($json));
  const body = $json.body !== undefined ? $json.body : $json;
  channelId = channelIdFromListResponse(body);
} catch (caught) {
  error = caught.message;
}
if (!channelId) {
  return { json: {
    items: [],
    failures: [sourceFailure(prev.source, 'youtube_channels', error || 'no channel id')],
    resolveOk: false,
  } };
}
return { json: {
  ...prev,
  channelId: channelId,
  resolveOk: true,
  cacheSql: cacheUpsertQuery(prev.source.slug, prev.handle, channelId),
} };
`);

iff('Channel id ok?');
postgres('Upsert channel cache', '={{ $json.cacheSql }}');

code('YouTube ready', 'runOnceForEachItem', `
if ($json && $json.source && $json.channelId) {
  return { json: { ...$json, rssReady: true, feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=' + $json.channelId } };
}
let context = null;
try {
  const resolved = $('Apply channel id').item.json;
  if (resolved && resolved.resolveOk && resolved.channelId) context = resolved;
} catch (error) {}
if (!context) context = $('Source context').item.json;
if (!context.channelId) {
  return { json: { rssReady: false, items: [], failures: [sourceFailure(context.source, 'youtube_channel', 'missing channel id')] } };
}
return { json: { ...context, rssReady: true, feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=' + context.channelId } };
`);

iff('RSS ready?');

http('Fetch YouTube RSS', {
  method: 'GET',
  url: '={{ $json.feedUrl }}',
  options: responseOptions('text'),
});

code('Parse YouTube feed', 'runOnceForEachItem', `
const prev = $('YouTube ready').item.json;
if ($json.error) {
  return { json: { items: [], failures: [sourceFailure(prev.source, 'youtube_rss', httpErrorText($json))] } };
}
const status = Number($json.statusCode || 0);
const xml = typeof $json.body === 'string' ? $json.body : '';
if (status !== 200 || !/<feed[\\s>]/i.test(xml)) {
  return { json: { items: [], failures: [sourceFailure(prev.source, 'youtube_rss', 'HTTP ' + (status || 'bad') + ' ' + xml.slice(0, 300))] } };
}
const parsed = parseYouTubeChannelFeed(xml, { limit: NEWEST_LIMIT });
return { json: {
  ...prev,
  parsed: parsed,
  hasParsed: parsed.length > 0,
  savedSql: savedIdsQuery(prev.source.slug, parsed.map((item) => item.itemId)),
} };
`);

iff('YouTube items?');
postgres('Saved YouTube ids', '={{ $json.savedSql }}');
code('Filter saved YouTube', 'runOnceForEachItem', `
const prev = $('Parse YouTube feed').item.json;
let saved = $json.saved_ids || [];
if (typeof saved === 'string') saved = JSON.parse(saved);
return { json: collectFromParsed(prev, prev.parsed, saved) };
`);
code('No new YouTube ids', 'runOnceForEachItem', `
const prev = $('Parse YouTube feed').item.json;
return { json: { items: [], failures: prev.failures || [] } };
`);

code('Podcast ready', 'runOnceForEachItem', `
const prev = $json;
if (prev.directCollect) return { json: { podcastReady: false, items: prev.items || [], failures: prev.failures || [] } };
if (!prev.source || !prev.source.url) {
  return { json: { podcastReady: false, items: [], failures: [sourceFailure(prev.source || {}, 'podcast_rss', 'missing url')] } };
}
return { json: { ...prev, podcastReady: true, feedUrl: prev.source.url } };
`);
iff('Podcast ready?');

http('Fetch podcast RSS', {
  method: 'GET',
  url: '={{ $json.feedUrl }}',
  options: responseOptions('text'),
});

code('Parse podcast feed', 'runOnceForEachItem', `
const prev = $('Podcast ready').item.json;
if ($json.error) {
  return { json: { items: [], failures: [sourceFailure(prev.source, 'podcast_rss', httpErrorText($json))], hasParsed: false } };
}
const status = Number($json.statusCode || 0);
const xml = typeof $json.body === 'string' ? $json.body : '';
if (status !== 200 || !/<rss[\\s>]/i.test(xml)) {
  return { json: { items: [], failures: [sourceFailure(prev.source, 'podcast_rss', 'HTTP ' + (status || 'bad'))], hasParsed: false } };
}
const parsed = parsePodcastFeed(xml, { limit: NEWEST_LIMIT });
const collected = applyPodcastFeed(prev, parsed);
const undecided = collected.items.filter((item) => !item.decided);
return { json: {
  ...prev,
  items: collected.items,
  failures: collected.failures,
  hasParsed: undecided.length > 0,
  savedSql: savedIdsQuery(prev.source.slug, undecided.map((item) => item.itemId)),
} };
`);

iff('Podcast items?');
postgres('Saved podcast ids', '={{ $json.savedSql }}');
code('Filter saved podcasts', 'runOnceForEachItem', `
const prev = $('Parse podcast feed').item.json;
let savedIds = $json.saved_ids || [];
if (typeof savedIds === 'string') savedIds = JSON.parse(savedIds);
const saved = new Set(savedIds);
const items = (prev.items || []).filter((item) => item.decided || !saved.has(item.itemId));
return { json: { items: items, failures: prev.failures || [] } };
`);
code('No undecided podcasts', 'runOnceForEachItem', `
const prev = $('Parse podcast feed').item.json;
return { json: { items: prev.items || [], failures: prev.failures || [] } };
`);

code('Collect', 'runOnceForEachItem', `
return { json: { items: $json.items || [], failures: $json.failures || [] } };
`);

code('List candidates', 'runOnceForAllItems', `
const batches = $('Collect').all().map((item) => item.json);
const items = batches.flatMap((batch) => batch.items || []);
const failures = batches.flatMap((batch) => batch.failures || []);
const cfg = $('Parse sources').first().json;
const sourceFailures = failures.concat(cfg.staleFailures || []);
return [{ json: {
  items: items,
  sourceFailures: sourceFailures,
  nothingToSave: items.length === 0,
  hasWork: items.length > 0,
  runId: cfg.runId,
  primary: cfg.primary,
  secondary: cfg.secondary,
  limit: cfg.limit,
  channel: cfg.channel,
  healthUrl: cfg.healthUrl,
} }];
`);

iff('Anything to save?');

http('Find Drive folder', {
  method: 'GET',
  url: "https://www.googleapis.com/drive/v3/files?q=name%3D'Trading%20Transcripts'%20and%20mimeType%3D'application%2Fvnd.google-apps.folder'%20and%20trashed%3Dfalse&fields=files(id,name,shared,trashed)&pageSize=10&spaces=drive",
  ...driveAuth(),
  options: responseOptions('json'),
});

code('Pick folder', 'runOnceForAllItems', `
const prev = $('List candidates').first().json;
if ($input.first().json.error) {
  throw new Error('Drive folder search failed: ' + httpErrorText($input.first().json));
}
const body = $input.first().json.body || $input.first().json;
const folderId = pickPrivateFolder(body.files || []);
return [{ json: { ...prev, folderId: folderId || '', needFolder: !folderId } }];
`);

iff('Need folder?');

http('Create Drive folder', {
  method: 'POST',
  url: 'https://www.googleapis.com/drive/v3/files?fields=id,name,shared',
  ...driveAuth(),
  sendBody: true,
  contentType: 'json',
  specifyBody: 'json',
  jsonBody: '{"name":"Trading Transcripts","mimeType":"application/vnd.google-apps.folder"}',
  options: responseOptions('json'),
});

code('Use created folder', 'runOnceForAllItems', `
const prev = $('Pick folder').first().json;
if ($input.first().json.error) throw new Error('Drive folder create failed: ' + httpErrorText($input.first().json));
const body = $input.first().json.body || $input.first().json;
if (!body.id) throw new Error('Drive folder create returned no id');
if (body.shared === true) throw new Error('refusing a shared Trading Transcripts folder');
return [{ json: { ...prev, folderId: body.id, needFolder: false } }];
`);

code('Expand items', 'runOnceForAllItems', `
const prev = $input.first().json;
if (!prev.folderId) throw new Error('Trading Transcripts folder missing');
return prev.items.map((item) => ({
  json: {
    ...item,
    folderId: prev.folderId,
    primary: item.primary || prev.primary,
    secondary: item.secondary || prev.secondary,
    runId: prev.runId,
  },
}));
`);

add('Split items', 'n8n-nodes-base.splitInBatches', 3, { batchSize: 1, options: {} });

code('Item route', 'runOnceForEachItem', `
return { json: {
  ...$json,
  isDecided: $json.decided === true,
  isYouTubeItem: $json.type === 'youtube_channel',
  hasTranscriptUrl: Boolean($json.transcriptUrl),
} };
`);

iff('Already decided?');
iff('YouTube item?');
iff('Podcast has VTT?');

http('Video details', {
  method: 'GET',
  url: "={{ 'https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,liveStreamingDetails&id=' + $json.itemId }}",
  ...queryAuth(),
  options: responseOptions('json'),
});

code('Classify video', 'runOnceForEachItem', `
const prev = $('Item route').item.json;
if ($json.error) {
  const error = httpErrorText($json);
  return { json: { ...prev, decided: true, status: 'failed', persist: true, shouldFetch: false, attempts: [{ method: 'youtube_videos', error: error }], error: error } };
}
let result;
try {
  const body = $json.body !== undefined ? $json.body : $json;
  result = interpretVideosList(body);
} catch (caught) {
  result = { ok: false, error: caught.message };
}
if (!result.ok) {
  return { json: { ...prev, decided: true, status: 'failed', persist: true, shouldFetch: false, attempts: [{ method: 'youtube_videos', error: result.error }], error: result.error } };
}
if (result.action === 'skip') {
  return { json: { ...prev, decided: true, status: 'skipped', persist: false, shouldFetch: false, durationSeconds: result.durationSeconds } };
}
if (result.action === 'defer') {
  return { json: { ...prev, decided: true, status: 'waiting', persist: true, shouldFetch: false, durationSeconds: result.durationSeconds, error: result.reason } };
}
return { json: {
  ...prev,
  shouldFetch: true,
  useSupadataPrimary: prev.primary === 'supadata',
  durationSeconds: result.durationSeconds,
  providerUrl: providerRequestUrl(prev.primary, prev.url),
} };
`);

iff('Fetch transcript?');
iff('Primary is Supadata?');

http('Supadata primary', {
  method: 'GET',
  url: '={{ $json.providerUrl }}',
  ...headerAuth(supadataCred),
  options: responseOptions('json'),
});
http('TranscriptAPI primary', {
  method: 'GET',
  url: '={{ $json.providerUrl }}',
  ...headerAuth(transcriptCred),
  options: responseOptions('json'),
});

code('Interpret primary', 'runOnceForEachItem', `
const prev = $('Classify video').item.json;
const errored = Boolean($json.error);
const next = applyProviderResult(prev, {
  which: 'provider_primary',
  provider: prev.primary,
  statusCode: errored ? 0 : Number($json.statusCode || 0),
  body: errored ? httpErrorText($json) : ($json.body !== undefined ? $json.body : $json),
  headers: $json.headers || {},
});
return { json: {
  ...next,
  needsSecondary: next.needsAnother === true,
  useSupadataSecondary: prev.secondary === 'supadata',
  providerUrl: providerRequestUrl(prev.secondary, prev.url),
} };
`);

iff('Need secondary?');
iff('Secondary is Supadata?');

http('Supadata secondary', {
  method: 'GET',
  url: '={{ $json.providerUrl }}',
  ...headerAuth(supadataCred),
  options: responseOptions('json'),
});
http('TranscriptAPI secondary', {
  method: 'GET',
  url: '={{ $json.providerUrl }}',
  ...headerAuth(transcriptCred),
  options: responseOptions('json'),
});

code('Interpret secondary', 'runOnceForEachItem', `
const prev = $('Interpret primary').item.json;
const errored = Boolean($json.error);
const next = applyProviderResult(prev, {
  which: 'provider_secondary',
  provider: prev.secondary,
  statusCode: errored ? 0 : Number($json.statusCode || 0),
  body: errored ? httpErrorText($json) : ($json.body !== undefined ? $json.body : $json),
  headers: $json.headers || {},
});
let command = '';
if (next.needsAnother) command = ytDlpCommand(prev.itemId).command;
return { json: { ...next, needsYtdlp: next.needsAnother === true, ytdlpCommand: command } };
`);

iff('Need yt-dlp?');
add('Run yt-dlp', 'n8n-nodes-base.executeCommand', 1, {
  command: '={{ $json.ytdlpCommand }}',
}, { onError: 'continueErrorOutput' });

code('Apply yt-dlp', 'runOnceForEachItem', `
const prev = $('Interpret secondary').item.json;
let parsed;
try {
  parsed = JSON.parse(($json && $json.stdout) || '');
} catch (error) {
  parsed = { ok: false, text: '', error: ($json && ($json.stderr || ($json.error && $json.error.message))) || error.message };
}
return { json: applyYtDlp(prev, parsed) };
`);

http('Fetch feed VTT', {
  method: 'GET',
  url: '={{ $json.transcriptUrl }}',
  options: responseOptions('text'),
});

code('Apply feed VTT', 'runOnceForEachItem', `
const prev = $('Item route').item.json;
if ($json.error) return { json: applyFeedVtt(prev, '', httpErrorText($json)) };
const status = Number($json.statusCode || 0);
const body = typeof $json.body === 'string' ? $json.body : '';
if (status !== 200 || !body.trim()) {
  return { json: applyFeedVtt(prev, '', 'HTTP ' + (status || 'bad') + ' empty VTT') };
}
const text = vttToPlainText(body);
if (!text.trim()) return { json: applyFeedVtt(prev, '', 'empty transcript') };
return { json: { ...prev, text: text, method: 'feed_vtt', status: null } };
`);

code('Prepare save', 'runOnceForEachItem', `
const prepared = prepareSave($json);
prepared.pendingDrive = prepared.status === 'pending_drive';
return { json: prepared };
`);

iff('Write doc?');

http('Create Google Doc', {
  method: 'POST',
  url: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,trashed,parents',
  ...driveAuth(),
  sendHeaders: true,
  headerParameters: {
    parameters: [{ name: 'Content-Type', value: '={{ $json.multipartContentType }}' }],
  },
  sendBody: true,
  contentType: 'raw',
  rawContentType: '={{ $json.multipartContentType }}',
  body: '={{ $json.multipartBody }}',
  options: responseOptions('json'),
});

code('After upload', 'runOnceForEachItem', `
const prev = $('Prepare save').item.json;
if ($json.error || Number($json.statusCode || 0) >= 400) {
  const error = 'drive create failed: ' + ($json.error ? httpErrorText($json) : ('HTTP ' + $json.statusCode));
  return { json: { ...prev, status: 'failed', persist: true, pendingDrive: false, hasCreatedId: false, error: error, attempts: (prev.attempts || []).concat([{ method: 'drive', error: error }]) } };
}
const body = $json.body || {};
if (!body.id) {
  const error = 'drive create returned no id';
  return { json: { ...prev, status: 'failed', persist: true, hasCreatedId: false, error: error, attempts: (prev.attempts || []).concat([{ method: 'drive', error: error }]) } };
}
return { json: { ...prev, createdId: body.id, hasCreatedId: true } };
`);

http('Read back doc', {
  method: 'GET',
  url: "={{ 'https://www.googleapis.com/drive/v3/files/' + $json.createdId + '?fields=id,name,mimeType,trashed,parents' }}",
  ...driveAuth(),
  options: responseOptions('json'),
});

code('Judge readback', 'runOnceForEachItem', `
const prev = $('After upload').item.json;
if ($json.error) {
  const error = 'drive readback failed: ' + httpErrorText($json);
  return { json: { ...prev, status: 'failed', persist: true, driveFileId: null, error: error, attempts: (prev.attempts || []).concat([{ method: 'drive_readback', error: error }]) } };
}
const meta = $json.body || $json;
const reason = Number($json.statusCode || 0) >= 400
  ? ('drive readback HTTP ' + $json.statusCode)
  : readbackFailure(meta, { name: prev.docName, folderId: prev.folderId });
if (reason) {
  const error = reason + (meta && meta.id ? ' id=' + meta.id : '');
  return { json: { ...prev, status: 'failed', persist: true, driveFileId: null, error: error, attempts: (prev.attempts || []).concat([{ method: 'drive_readback', error: error }]) } };
}
return { json: { ...prev, status: 'saved', persist: true, driveFileId: meta.id, error: null } };
`);

code('Outcome', 'runOnceForEachItem', `
const row = toOutcome($json);
return { json: { ...row, persist: row.persist === true, sql: row.persist ? upsertTranscriptQuery(row) : '' } };
`);

iff('Persist row?');
postgres('Upsert transcript', '={{ $json.sql }}');
code('Loop signal', 'runOnceForEachItem', `
return { json: { cont: true } };
`);

code('Summarize', 'runOnceForAllItems', `
let outcomes = [];
try { outcomes = $('Outcome').all().map((item) => item.json); } catch (error) { outcomes = []; }
const listed = $('List candidates').first().json;
const summary = summarizeRun({
  outcomes: outcomes,
  sourceFailures: listed.sourceFailures || [],
  limit: listed.limit,
});
return [{ json: {
  ...summary,
  runId: listed.runId,
  channel: listed.channel,
  healthUrl: listed.healthUrl,
  limit: listed.limit,
  monthStart: monthStartEt(new Date()),
  hasCredits: summary.credits > 0,
  hasFailures: summary.failed > 0,
  runOk: summary.ok,
} }];
`);

iff('Has failures?');
add('Slack failure DM', 'n8n-nodes-base.slack', 2.2, {
  select: 'channel',
  channelId: "={{ $('Summarize').first().json.channel }}",
  text: "={{ $('Summarize').first().json.dm }}",
  otherOptions: { includeLinkToWorkflow: false },
}, { ...slackCred, onError: 'continueErrorOutput' });

iff('Used credits?', "={{ $('Summarize').first().json.hasCredits }}");
postgres('Add monthly credits', '={{ $json.creditSql }}');
code('Prepare credit SQL', 'runOnceForAllItems', `
const summary = $('Summarize').first().json;
return [{ json: { ...summary, creditSql: creditIncrementQuery(summary.monthStart, summary.credits) } }];
`);

code('Decide warning', 'runOnceForAllItems', `
const summary = $('Prepare credit SQL').first().json;
const row = $input.first().json;
const alreadyWarned = row.warning_sent_at != null && row.warning_sent_at !== '';
const sendWarning = creditWarningNeeded({
  creditsUsed: row.credits_used,
  limit: summary.limit,
  alreadyWarned: alreadyWarned,
});
return [{ json: {
  ...summary,
  sendWarning: sendWarning,
  claimSql: creditClaimQuery(summary.monthStart, summary.limit),
  warningText: 'TRANSCRIPT CREDITS - monthly usage is ' + row.credits_used + ' of ' + summary.limit + ' (80% of MONTHLY_TRANSCRIPT_LIMIT).',
} }];
`);

iff('Send credit warning?');
postgres('Claim credit warning', '={{ $json.claimSql }}');
code('Warning claimed?', 'runOnceForAllItems', `
const prev = $('Decide warning').first().json;
const claimed = Number(($input.first().json && $input.first().json.claimed) || 0) === 1;
return [{ json: { ...prev, sendWarning: claimed } }];
`);

iff('Claimed warning?');
iff('Doc created?');

add('Slack credit warning', 'n8n-nodes-base.slack', 2.2, {
  select: 'channel',
  channelId: "={{ $('Decide warning').first().json.channel }}",
  text: "={{ $('Decide warning').first().json.warningText }}",
  otherOptions: { includeLinkToWorkflow: false },
}, { ...slackCred, onError: 'continueErrorOutput' });

code('Finish', 'runOnceForAllItems', `
const summary = $('Summarize').first().json;
return [{ json: {
  ...summary,
  finishSql: finishRunQuery({
    runId: summary.runId,
    status: summary.runOk ? 'ok' : 'failed',
    saved: summary.saved,
    waiting: summary.waiting,
    failed: summary.failed,
    credits: summary.credits,
    error: summary.runOk ? null : (summary.dm || 'failed'),
  }),
  healthOk: healthUrlFor(summary.healthUrl, true),
  healthFail: healthUrlFor(summary.healthUrl, false),
} }];
`);

postgres('Patch run', "={{ $('Finish').first().json.finishSql }}");
iff('Run ok?', "={{ $('Finish').first().json.runOk }}");
http('Ping health ok', {
  method: 'GET',
  url: "={{ $('Finish').first().json.healthOk }}",
  options: {},
}, { retryOnFail: false, maxTries: 1, onError: 'continueRegularOutput' });
http('Ping health fail', {
  method: 'GET',
  url: "={{ $('Finish').first().json.healthFail }}",
  options: {},
}, { retryOnFail: false, maxTries: 1, onError: 'continueRegularOutput' });

function wire() {
  link('Manual run', 'Assert config');
  link('Weekday and Sunday schedule', 'Assert config');
  link('Assert config', 'Check yt-dlp version');
  link('Check yt-dlp version', 'Require pinned yt-dlp');
  link('Require pinned yt-dlp', 'Attach stale sweep');
  link('Attach stale sweep', 'Sweep stale runs');
  link('Sweep stale runs', 'Note stale');
  link('Note stale', 'Insert run');
  link('Insert run', 'Read sources');
  link('Read sources', 'Parse sources');
  link('Parse sources', 'Fan out sources');
  link('Fan out sources', 'Split sources');
  link('Split sources', 'List candidates', 0);
  link('Split sources', 'Source context', 1);
  link('Source context', 'YouTube source?');
  link('YouTube source?', 'Needs channel id?', 0);
  link('YouTube source?', 'Podcast ready', 1);
  link('Needs channel id?', 'Prepare cache lookup', 0);
  link('Needs channel id?', 'YouTube ready', 1);
  link('Prepare cache lookup', 'Lookup channel cache');
  link('Lookup channel cache', 'Apply cache');
  link('Apply cache', 'Cache hit?');
  link('Cache hit?', 'YouTube ready', 0);
  link('Cache hit?', 'Resolve handle', 1);
  link('Resolve handle', 'Apply channel id', 0);
  link('Resolve handle', 'Apply channel id', 1);
  link('Apply channel id', 'Channel id ok?');
  link('Channel id ok?', 'Upsert channel cache', 0);
  link('Channel id ok?', 'Collect', 1);
  link('Upsert channel cache', 'YouTube ready');
  link('YouTube ready', 'RSS ready?');
  link('RSS ready?', 'Fetch YouTube RSS', 0);
  link('RSS ready?', 'Collect', 1);
  link('Fetch YouTube RSS', 'Parse YouTube feed', 0);
  link('Fetch YouTube RSS', 'Parse YouTube feed', 1);
  link('Parse YouTube feed', 'YouTube items?');
  link('YouTube items?', 'Saved YouTube ids', 0);
  link('YouTube items?', 'No new YouTube ids', 1);
  link('Saved YouTube ids', 'Filter saved YouTube');
  link('Filter saved YouTube', 'Collect');
  link('No new YouTube ids', 'Collect');
  link('Podcast ready', 'Podcast ready?');
  link('Podcast ready?', 'Fetch podcast RSS', 0);
  link('Podcast ready?', 'Collect', 1);
  link('Fetch podcast RSS', 'Parse podcast feed', 0);
  link('Fetch podcast RSS', 'Parse podcast feed', 1);
  link('Parse podcast feed', 'Podcast items?');
  link('Podcast items?', 'Saved podcast ids', 0);
  link('Podcast items?', 'No undecided podcasts', 1);
  link('Saved podcast ids', 'Filter saved podcasts');
  link('Filter saved podcasts', 'Collect');
  link('No undecided podcasts', 'Collect');
  link('Collect', 'Split sources');
  link('List candidates', 'Anything to save?');
  link('Anything to save?', 'Find Drive folder', 0);
  link('Anything to save?', 'Summarize', 1);
  link('Find Drive folder', 'Pick folder', 0);
  link('Find Drive folder', 'Pick folder', 1);
  link('Pick folder', 'Need folder?');
  link('Need folder?', 'Create Drive folder', 0);
  link('Need folder?', 'Expand items', 1);
  link('Create Drive folder', 'Use created folder', 0);
  link('Create Drive folder', 'Use created folder', 1);
  link('Use created folder', 'Expand items');
  link('Expand items', 'Split items');
  link('Split items', 'Summarize', 0);
  link('Split items', 'Item route', 1);
  link('Item route', 'Already decided?');
  link('Already decided?', 'Outcome', 0);
  link('Already decided?', 'YouTube item?', 1);
  link('YouTube item?', 'Video details', 0);
  link('YouTube item?', 'Podcast has VTT?', 1);
  link('Podcast has VTT?', 'Fetch feed VTT', 0);
  link('Podcast has VTT?', 'Outcome', 1);
  link('Video details', 'Classify video', 0);
  link('Video details', 'Classify video', 1);
  link('Classify video', 'Fetch transcript?');
  link('Fetch transcript?', 'Primary is Supadata?', 0);
  link('Fetch transcript?', 'Outcome', 1);
  link('Primary is Supadata?', 'Supadata primary', 0);
  link('Primary is Supadata?', 'TranscriptAPI primary', 1);
  link('Supadata primary', 'Interpret primary', 0);
  link('Supadata primary', 'Interpret primary', 1);
  link('TranscriptAPI primary', 'Interpret primary', 0);
  link('TranscriptAPI primary', 'Interpret primary', 1);
  link('Interpret primary', 'Need secondary?');
  link('Need secondary?', 'Secondary is Supadata?', 0);
  link('Need secondary?', 'Prepare save', 1);
  link('Secondary is Supadata?', 'Supadata secondary', 0);
  link('Secondary is Supadata?', 'TranscriptAPI secondary', 1);
  link('Supadata secondary', 'Interpret secondary', 0);
  link('Supadata secondary', 'Interpret secondary', 1);
  link('TranscriptAPI secondary', 'Interpret secondary', 0);
  link('TranscriptAPI secondary', 'Interpret secondary', 1);
  link('Interpret secondary', 'Need yt-dlp?');
  link('Need yt-dlp?', 'Run yt-dlp', 0);
  link('Need yt-dlp?', 'Prepare save', 1);
  link('Run yt-dlp', 'Apply yt-dlp', 0);
  link('Run yt-dlp', 'Apply yt-dlp', 1);
  link('Apply yt-dlp', 'Prepare save');
  link('Fetch feed VTT', 'Apply feed VTT', 0);
  link('Fetch feed VTT', 'Apply feed VTT', 1);
  link('Apply feed VTT', 'Prepare save');
  link('Prepare save', 'Write doc?');
  link('Write doc?', 'Create Google Doc', 0);
  link('Write doc?', 'Outcome', 1);
  link('Create Google Doc', 'After upload', 0);
  link('Create Google Doc', 'After upload', 1);
  link('After upload', 'Doc created?');
  link('Doc created?', 'Read back doc', 0);
  link('Doc created?', 'Outcome', 1);
  link('Read back doc', 'Judge readback', 0);
  link('Read back doc', 'Judge readback', 1);
  link('Judge readback', 'Outcome');
  link('Outcome', 'Persist row?');
  link('Persist row?', 'Upsert transcript', 0);
  link('Persist row?', 'Loop signal', 1);
  link('Upsert transcript', 'Loop signal');
  link('Loop signal', 'Split items');
  link('Summarize', 'Has failures?');
  link('Has failures?', 'Slack failure DM', 0);
  link('Has failures?', 'Used credits?', 1);
  link('Slack failure DM', 'Used credits?', 0);
  link('Slack failure DM', 'Used credits?', 1);
  link('Used credits?', 'Prepare credit SQL', 0);
  link('Used credits?', 'Finish', 1);
  link('Prepare credit SQL', 'Add monthly credits');
  link('Add monthly credits', 'Decide warning');
  link('Decide warning', 'Send credit warning?');
  link('Send credit warning?', 'Claim credit warning', 0);
  link('Send credit warning?', 'Finish', 1);
  link('Claim credit warning', 'Warning claimed?');
  link('Warning claimed?', 'Claimed warning?');
  link('Claimed warning?', 'Slack credit warning', 0);
  link('Claimed warning?', 'Finish', 1);
  link('Slack credit warning', 'Finish', 0);
  link('Slack credit warning', 'Finish', 1);
  link('Finish', 'Patch run');
  link('Patch run', 'Run ok?');
  link('Run ok?', 'Ping health ok', 0);
  link('Run ok?', 'Ping health fail', 1);
}

wire();

if (/\bimport\s/.test(prelude) || /^export\s/m.test(prelude)) {
  throw new Error('prelude still has import or export');
}

const names = new Set(nodes.map((node) => node.name));
for (const [from, value] of Object.entries(connections)) {
  if (!names.has(from)) throw new Error(`connection from unknown node ${from}`);
  for (const output of value.main) {
    for (const edge of output) {
      if (!names.has(edge.node)) throw new Error(`${from} links to unknown node ${edge.node}`);
    }
  }
}

const workflow = {
  name: 'Trading Transcripts',
  nodes,
  connections,
  settings: {
    executionOrder: 'v1',
    timezone: 'America/New_York',
  },
  staticData: null,
  meta: {
    templateCredsSetupCompleted: false,
    notes: [
      'Personal n8n only (market-alerts/deploy, container n8n-personal). Do not import this into the ChartSignl n8n service.',
      'Credentials: Postgres transcripts_n8n; Slack Bot; YouTube Data API Key as Query Auth parameter name "key"; Supadata API Key as Header Auth name x-api-key; TranscriptAPI Bearer as Header Auth name Authorization value "Bearer <key>"; Google Drive OAuth (drive.file). No secrets in this file.',
      'n8n Variables: TRANSCRIPT_TIMEZONE=America/New_York, TRANSCRIPT_PROVIDER=supadata|transcriptapi, MONTHLY_TRANSCRIPT_LIMIT=100, HEALTHCHECK_TRANSCRIPTS_URL, SLACK_ALERT_CHANNEL.',
      'Provider endpoints checked 2026-11-04. Supadata GET https://api.supadata.ai/v1/transcript mode=native. TranscriptAPI GET https://transcriptapi.com/api/v2/youtube/transcript.',
      'yt-dlp is pinned to 2026.10.26 in the personal image. Keep the Trading Transcripts Drive folder unshared.',
      'Set the error workflow to Trading Transcripts — Error Handler after import.',
    ].join(' '),
  },
};

const out = join(repo, 'n8n', 'transcripts.json');
writeFileSync(out, JSON.stringify(workflow, null, 2));
console.log(`wrote ${out} (${nodes.length} nodes)`);
