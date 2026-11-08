import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const workflow = JSON.parse(readFileSync(new URL('../../n8n/transcripts.json', import.meta.url), 'utf8'));
const chartsignlCompose = readFileSync(new URL('../../../apps/backend/deploy/docker-compose.yml', import.meta.url), 'utf8');
const personalCompose = readFileSync(new URL('../../deploy/docker-compose.yml', import.meta.url), 'utf8');
const dockerfile = readFileSync(new URL('../../deploy/Dockerfile', import.meta.url), 'utf8');

function node(name) {
  const found = workflow.nodes.find((item) => item.name === name);
  assert.ok(found, `missing node ${name}`);
  return found;
}

describe('transcript workflow', () => {
  it('is scheduled in America/New_York and fails closed', () => {
    assert.equal(workflow.settings.timezone, 'America/New_York');
    const crons = node('Weekday and Sunday schedule').parameters.rule.interval.map((rule) => rule.expression);
    assert.deepEqual(crons, ['10 6 * * 1-5', '40 20 * * 1-5', '40 16 * * 0']);
    assert.match(node('Assert config').parameters.jsCode, /timezone mismatch/);
    assert.match(node('Require pinned yt-dlp').parameters.jsCode, /yt-dlp version mismatch/);
  });

  it('wires the current provider endpoints and yt-dlp backup', () => {
    const blob = JSON.stringify(workflow);
    assert.match(blob, /https:\/\/api\.supadata\.ai\/v1\/transcript/);
    assert.match(blob, /mode=native|mode: 'native'/);
    assert.match(blob, /x-api-key/);
    assert.match(blob, /https:\/\/transcriptapi\.com\/api\/v2\/youtube\/transcript/);
    assert.match(blob, /--skip-download/);
    assert.match(blob, /--write-auto-subs/);
    assert.match(blob, /--sub-langs en/);
    assert.match(blob, /--sub-format vtt/);
    assert.match(blob, /TRANSCRIPT FETCH FAILED - /);
    assert.match(blob, /Trading Transcripts/);
    assert.doesNotMatch(blob, /AIza[0-9A-Za-z_-]{10,}/);
    assert.doesNotMatch(blob, /xoxb-/);
    assert.doesNotMatch(blob, /sk-[A-Za-z0-9]{10,}/);
  });

  it('loops on the splitInBatches v3 loop output', () => {
    assert.equal(workflow.connections['Split sources'].main[1][0].node, 'Source context');
    assert.equal(workflow.connections['Split sources'].main[0][0].node, 'List candidates');
    assert.equal(workflow.connections['Split items'].main[1][0].node, 'Item route');
    assert.equal(workflow.connections['Split items'].main[0][0].node, 'Summarize');
  });

  it('compiles every code node', () => {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    for (const item of workflow.nodes) {
      if (!item.parameters?.jsCode) continue;
      assert.doesNotThrow(() => new AsyncFunction(item.parameters.jsCode), item.name);
    }
  });
});

describe('personal n8n container', () => {
  it('does not change the ChartSignl n8n service', () => {
    assert.match(chartsignlCompose, /container_name: n8n\b/);
    assert.match(chartsignlCompose, /image: docker\.n8n\.io\/n8nio\/n8n\n/);
    assert.doesNotMatch(chartsignlCompose, /yt-dlp/);
    assert.doesNotMatch(chartsignlCompose, /n8n-personal/);
  });

  it('pins yt-dlp on n8n-personal only', () => {
    assert.match(personalCompose, /container_name: n8n-personal/);
    assert.match(personalCompose, /5679:5678/);
    assert.match(dockerfile, /yt-dlp==2026\.10\.26/);
    assert.match(dockerfile, /n8n:2\.46\.6/);
    assert.doesNotMatch(personalCompose, /SUPADATA|TRANSCRIPTAPI_KEY|YOUTUBE_API_KEY/);
  });
});
