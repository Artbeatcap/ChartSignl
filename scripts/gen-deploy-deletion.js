#!/usr/bin/env node
/**
 * Generates deploy-deletion.sh that deploys data-deletion.html and confirm-deletion.html
 * to /srv/chartsignl-web/ on the server. Run from repo root:
 *   npm run gen-deploy-deletion
 * Then: scp deploy-deletion.sh root@YOUR_SERVER:/tmp/
 *       ssh root@YOUR_SERVER 'bash /tmp/deploy-deletion.sh'
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const staticDir = path.join(repoRoot, 'apps', 'mobile', 'static');
const dataDeletionPath = path.join(staticDir, 'data-deletion.html');
const confirmDeletionPath = path.join(staticDir, 'confirm-deletion.html');
const outPath = path.join(repoRoot, 'deploy-deletion.sh');

const DELIM1 = 'GEN_DELETION_END_1';
const DELIM2 = 'GEN_DELETION_END_2';

const dataDeletion = fs.readFileSync(dataDeletionPath, 'utf8');
const confirmDeletion = fs.readFileSync(confirmDeletionPath, 'utf8');

const script = `#!/bin/bash
set -e
cd /srv/chartsignl-web/

cat > data-deletion.html << '${DELIM1}'
${dataDeletion}
${DELIM1}

cat > confirm-deletion.html << '${DELIM2}'
${confirmDeletion}
${DELIM2}

ls -la data-deletion.html confirm-deletion.html
echo "Done. data-deletion.html and confirm-deletion.html deployed."
`;

fs.writeFileSync(outPath, script, 'utf8');
console.error('Wrote deploy-deletion.sh. Copy to server and run: bash /tmp/deploy-deletion.sh');
