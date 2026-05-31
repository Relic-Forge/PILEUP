import { existsSync, readFileSync } from 'node:fs';

const registryPath = 'data/assets/asset_registry.json';
const approvedPath = 'data/assets/approved_assets.json';
const generationManifestPath = 'data/assets/asset_generation_manifest.json';
const runtimeManifestPath = 'data/asset_manifest.json';

const allowedStatuses = new Set(['concept', 'candidate', 'approved', 'locked', 'deprecated']);
const requiredAssetFields = [
  'assetId',
  'aliases',
  'displayName',
  'category',
  'status',
  'artVersion',
  'owner',
  'sourceReference',
  'approvedContactSheet',
  'runtimeFiles',
  'lockedIdentity',
  'doNotChange',
  'allowedVariations',
  'notes',
];

const requiredMvpAssetIds = [
  'character.player_child',
  'enemy.laundry_monster',
  'enemy.socklings',
  'enemy.drawer_mimic',
  'enemy.hanging_coat_stalker',
  'enemy.dish_crawler',
  'boss.door_hoard',
  'room.level01_bedroom',
  'room.level01_hallway',
  'room.level01_bathroom',
  'room.level01_kitchen',
  'room.level01_living_room_front_door',
  'ui.hud_core',
  'vfx.flashlight_cone',
];

const requiredBatchFields = [
  'batchId',
  'createdUtc',
  'assetId',
  'requestedOutput',
  'lifecycleState',
  'sourceReferences',
  'prompt',
  'negativePrompt',
  'tool',
  'seed',
  'outputFiles',
  'reviewStatus',
  'qaChecks',
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function fail(message) {
  throw new Error(message);
}

const registry = readJson(registryPath);
const approved = readJson(approvedPath);
const generationManifest = readJson(generationManifestPath);
const runtimeManifest = readJson(runtimeManifestPath);

if (registry.schema !== 'pileup_asset_registry_v1') {
  fail(`${registryPath} has unexpected schema ${registry.schema}`);
}

if (!Array.isArray(registry.assets) || registry.assets.length === 0) {
  fail(`${registryPath} must contain a non-empty assets array`);
}

const assetIds = new Set();
const aliases = new Map();

for (const asset of registry.assets) {
  for (const field of requiredAssetFields) {
    if (!(field in asset)) {
      fail(`${asset.assetId ?? '<unknown>'} is missing required field ${field}`);
    }
  }

  if (!/^[a-z]+(\.[a-z0-9_]+)+$/.test(asset.assetId)) {
    fail(`${asset.assetId} must use category.slug canonical format`);
  }

  if (assetIds.has(asset.assetId)) {
    fail(`Duplicate assetId ${asset.assetId}`);
  }
  assetIds.add(asset.assetId);

  if (!allowedStatuses.has(asset.status)) {
    fail(`${asset.assetId} has invalid status ${asset.status}`);
  }

  if (!Array.isArray(asset.aliases)) {
    fail(`${asset.assetId} aliases must be an array`);
  }

  for (const alias of asset.aliases) {
    if (aliases.has(alias)) {
      fail(`Alias ${alias} is shared by ${aliases.get(alias)} and ${asset.assetId}`);
    }
    aliases.set(alias, asset.assetId);
  }

  if (!Array.isArray(asset.runtimeFiles)) {
    fail(`${asset.assetId} runtimeFiles must be an array`);
  }

  for (const runtimeFile of asset.runtimeFiles) {
    if (!existsSync(runtimeFile)) {
      fail(`${asset.assetId} references missing runtime file ${runtimeFile}`);
    }
  }

  if (!Array.isArray(asset.doNotChange) || asset.doNotChange.length === 0) {
    fail(`${asset.assetId} must define doNotChange entries`);
  }

  if (!Array.isArray(asset.allowedVariations) || asset.allowedVariations.length === 0) {
    fail(`${asset.assetId} must define allowedVariations entries`);
  }

  if (typeof asset.lockedIdentity !== 'object' || asset.lockedIdentity === null) {
    fail(`${asset.assetId} must define lockedIdentity`);
  }

  if ((asset.status === 'approved' || asset.status === 'locked') && !asset.approvedContactSheet) {
    fail(`${asset.assetId} cannot be ${asset.status} without approvedContactSheet`);
  }
}

for (const requiredId of requiredMvpAssetIds) {
  if (!assetIds.has(requiredId)) {
    fail(`Missing MVP assetId ${requiredId}`);
  }
}

for (const approvedAssetId of approved.approvedAssetIds ?? []) {
  if (!assetIds.has(approvedAssetId)) {
    fail(`${approvedPath} references unknown assetId ${approvedAssetId}`);
  }
}

for (const batch of generationManifest.batches ?? []) {
  for (const field of requiredBatchFields) {
    if (!(field in batch)) {
      fail(`${generationManifestPath} batch ${batch.batchId ?? '<unknown>'} is missing required field ${field}`);
    }
  }

  if (!assetIds.has(batch.assetId)) {
    fail(`${generationManifestPath} batch ${batch.batchId ?? '<unknown>'} references unknown assetId ${batch.assetId}`);
  }

  if (!generationManifest.reviewStatuses.includes(batch.reviewStatus)) {
    fail(`${generationManifestPath} batch ${batch.batchId} has invalid reviewStatus ${batch.reviewStatus}`);
  }

  if (!Array.isArray(batch.outputFiles) || batch.outputFiles.length === 0) {
    fail(`${generationManifestPath} batch ${batch.batchId} must list outputFiles`);
  }

  for (const output of batch.outputFiles) {
    const outputPath = typeof output === 'string' ? output : output.path;

    if (!outputPath) {
      fail(`${generationManifestPath} batch ${batch.batchId} has an output file without a path`);
    }

    if (!existsSync(outputPath)) {
      fail(`${generationManifestPath} batch ${batch.batchId} references missing output ${outputPath}`);
    }
  }

  if (!Array.isArray(batch.qaChecks) || batch.qaChecks.length === 0) {
    fail(`${generationManifestPath} batch ${batch.batchId} must list qaChecks`);
  }
}

for (const candidate of runtimeManifest.candidate_assets ?? []) {
  if (!assetIds.has(candidate.assetId)) {
    fail(`${runtimeManifestPath} candidate ${candidate.id ?? '<unknown>'} references unknown assetId ${candidate.assetId}`);
  }

  for (const field of ['manifest', 'source_contact_sheet', 'source_pose_directory', 'runtime_root']) {
    if (!candidate[field] || !existsSync(candidate[field])) {
      fail(`${runtimeManifestPath} candidate ${candidate.id ?? '<unknown>'} references missing ${field}: ${candidate[field]}`);
    }
  }
}

console.log(`Asset registry ok: ${registry.assets.length} assets, ${aliases.size} aliases`);
