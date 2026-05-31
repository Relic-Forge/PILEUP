import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { inflateSync, deflateSync } from 'node:zlib';

const SOURCE_SHEET = 'art/source/characters/player_child/player_child_contact_sheet_v0_2_candidate_rgba.png';
const WALK_CYCLE_SHEET = 'art/source/characters/player_child/player_child_walk_cycle_v0_3_raw.png';
const SOURCE_FRAME_SIZE = 2048;
const RUNTIME_TIERS = [
  { name: 'mobile', frameSize: 512 },
  { name: 'standard', frameSize: 768 },
  { name: 'high_4k', frameSize: 1024 },
];
const POSES = [
  { id: 'idle_flashlight_forward', row: 0, col: 0, stateHint: 'idle' },
  { id: 'cautious_walk', row: 0, col: 1, stateHint: 'walk_run_depth' },
  { id: 'search_clutter', row: 0, col: 2, stateHint: 'search' },
  { id: 'hurt_recoil', row: 1, col: 0, stateHint: 'hurt' },
  { id: 'flashlight_high_aim', row: 1, col: 1, stateHint: 'depth_flashlight' },
  { id: 'unlock_door', row: 1, col: 2, stateHint: 'unlock_door' },
];
const ANIMATIONS = [
  { id: 'idle', pose: 'idle_flashlight_forward', frames: 8, fps: 6, loop: true },
  { id: 'walk', cycle: 'walk', frames: 10, fps: 10, loop: true },
  { id: 'run', cycle: 'walk', frames: 10, fps: 14, loop: true },
  { id: 'depth_step_up', pose: 'flashlight_high_aim', frames: 6, fps: 10, loop: true },
  { id: 'depth_step_down', pose: 'cautious_walk', frames: 6, fps: 10, loop: true },
  { id: 'search', pose: 'search_clutter', frames: 12, fps: 10, loop: true },
  { id: 'broom_attack', pose: 'cautious_walk', frames: 8, fps: 12, loop: false },
  { id: 'spray_use', pose: 'flashlight_high_aim', frames: 6, fps: 10, loop: false },
  { id: 'hurt', pose: 'hurt_recoil', frames: 6, fps: 8, loop: false },
  { id: 'unlock_door', pose: 'unlock_door', frames: 12, fps: 8, loop: true },
];

const source = readPng(SOURCE_SHEET);
const walkCycleSource = readPng(WALK_CYCLE_SHEET);
const sourceCellWidth = Math.floor(source.width / 3);
const sourceCellHeight = Math.floor(source.height / 2);
const sourcePoseDir = 'art/source/characters/player_child/v0_2/poses_2048';
const runtimeRoot = 'public/assets/characters/player_child/v0_2';
const manifestPath = 'public/assets/characters/player_child/v0_2/player_child_v0_2.asset.json';
const poseFrames = new Map();
const cycleFrames = new Map();
const manifest = {
  schema: 'pileup_character_asset_set_v1',
  assetId: 'character.player_child',
  artVersion: '0.2.0',
  lifecycleState: 'candidate',
  sourceContactSheet: SOURCE_SHEET,
  sourceFrameSize: [SOURCE_FRAME_SIZE, SOURCE_FRAME_SIZE],
  runtimeTiers: Object.fromEntries(RUNTIME_TIERS.map((tier) => [tier.name, [tier.frameSize, tier.frameSize]])),
  anchor: { x: 0.5, y: 0.92 },
  notes: [
    'Candidate asset set generated from the v0.2 six-pose contact sheet plus the v0.3 walk-cycle sheet.',
    'Walk and run use generated cycle frames; other animation states remain proxy timing sheets until bespoke frame art is approved.',
  ],
  poses: [],
  animations: [],
};

mkdirSync(sourcePoseDir, { recursive: true });
mkdirSync(runtimeRoot, { recursive: true });

for (const pose of POSES) {
  const cell = cropPng(
    source,
    pose.col * sourceCellWidth,
    pose.row * sourceCellHeight,
    sourceCellWidth,
    sourceCellHeight,
  );
  const cleanedCell = cleanMatteAndIslands(cell);
  stripBakedFlashlightLight(cleanedCell);
  const bbox = alphaBounds(cleanedCell, 24);
  const trimmed = bbox ? cropPng(cleanedCell, bbox.x, bbox.y, bbox.width, bbox.height) : cleanedCell;
  const framedSource = containOnTransparentFrame(trimmed, SOURCE_FRAME_SIZE, 0.58, 0.9);
  if (pose.id === 'hurt_recoil') {
    removeDetachedLowerRightArtifact(framedSource);
  }
  const sourcePath = join(sourcePoseDir, `${pose.id}_source_2048.png`);
  writePng(sourcePath, framedSource);

  const poseEntry = {
    id: pose.id,
    stateHint: pose.stateHint,
    source: sourcePath,
    runtime: {},
  };

  for (const tier of RUNTIME_TIERS) {
    const resized = resizePng(framedSource, tier.frameSize, tier.frameSize);
    const tierDir = join(runtimeRoot, tier.name, 'poses');
    mkdirSync(tierDir, { recursive: true });
    const runtimePath = join(tierDir, `${pose.id}_${tier.frameSize}.png`);
    writePng(runtimePath, resized);
    poseEntry.runtime[tier.name] = runtimePath;
  }

  manifest.poses.push(poseEntry);
  poseFrames.set(pose.id, framedSource);
}

const walkFrames = [];
const walkCellWidth = Math.floor(walkCycleSource.width / 5);
const walkCellHeight = Math.floor(walkCycleSource.height / 2);
for (let index = 0; index < 10; index += 1) {
  const row = Math.floor(index / 5);
  const col = index % 5;
  const cell = cropPng(walkCycleSource, col * walkCellWidth, row * walkCellHeight, walkCellWidth, walkCellHeight);
  const cleanedCell = cleanMatteAndIslands(cell);
  matchStandingChildStyle(cleanedCell);
  stripBakedFlashlightLight(cleanedCell);
  const bbox = alphaBounds(cleanedCell, 24);
  const trimmed = bbox ? cropPng(cleanedCell, bbox.x, bbox.y, bbox.width, bbox.height) : cleanedCell;
  const framedSource = containOnTransparentFrame(trimmed, SOURCE_FRAME_SIZE, 0.56, 0.9, {
    maxHeightRatio: 0.78,
  });
  const sourcePath = join(sourcePoseDir, `walk_cycle_frame_${String(index).padStart(2, '0')}_source_2048.png`);
  writePng(sourcePath, framedSource);
  walkFrames.push(framedSource);
}
cycleFrames.set('walk', walkFrames);

for (const animation of ANIMATIONS) {
  const animationCycle = animation.cycle ? cycleFrames.get(animation.cycle) : undefined;
  const sourceFrame = animation.pose ? poseFrames.get(animation.pose) : undefined;

  if (!sourceFrame && !animationCycle) {
    throw new Error(`Missing pose ${animation.pose} for animation ${animation.id}`);
  }

  const animationEntry = {
    id: animation.id,
    sourcePose: animation.pose ?? animation.cycle,
    frames: animation.frames,
    fps: animation.fps,
    loop: animation.loop,
    status: animationCycle ? 'candidate_cycle' : 'candidate_proxy',
    frameLayout: {},
    sheets: {},
    metadata: {},
  };

  for (const tier of RUNTIME_TIERS) {
    const frames = animationCycle
      ? animationCycle.map((frame) => resizePng(frame, tier.frameSize, tier.frameSize))
      : [resizePng(sourceFrame, tier.frameSize, tier.frameSize)];
    const columns = Math.min(4, animation.frames);
    const rows = Math.ceil(animation.frames / columns);
    const sheet = makeSheet(frames, animation.frames, columns, rows, animation.id);
    const sheetDir = join(runtimeRoot, tier.name, 'sheets');
    mkdirSync(sheetDir, { recursive: true });
    const sheetPath = join(sheetDir, `player_child_${animation.id}_${tier.name}_${tier.frameSize}.png`);
    writePng(sheetPath, sheet);

    const metadataPath = sheetPath.replace(/\.png$/, '.json');
    const metadata = {
      schema: 'pileup_animation_sheet_v1',
      assetId: 'character.player_child',
      animationId: animation.id,
      artVersion: '0.2.0',
      status: animationCycle ? 'candidate_cycle' : 'candidate_proxy',
      sheet: sheetPath,
      frameSize: [tier.frameSize, tier.frameSize],
      frames: animation.frames,
      columns,
      rows,
      fps: animation.fps,
      loop: animation.loop,
      anchor: manifest.anchor,
      sourcePose: animation.pose,
      notes: animationCycle
        ? 'Generated walk-cycle frames packaged for candidate runtime review. Replace only if art direction requests a new cycle.'
        : 'Repeated-pose timing sheet generated for resolution/package validation. Replace with bespoke approved animation frames before final gameplay art.',
    };
    writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);

    animationEntry.frameLayout[tier.name] = { frameSize: [tier.frameSize, tier.frameSize], columns, rows };
    animationEntry.sheets[tier.name] = sheetPath;
    animationEntry.metadata[tier.name] = metadataPath;
  }

  manifest.animations.push(animationEntry);
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Built player asset set: ${manifestPath}`);
console.log(`Source poses: ${manifest.poses.length}; runtime animation sheets: ${manifest.animations.length * RUNTIME_TIERS.length}`);

function readPng(path) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const input = readFileSync(path);

  if (!input.subarray(0, 8).equals(signature)) {
    throw new Error(`${path} is not a PNG file`);
  }

  const chunks = [];
  let offset = 8;

  while (offset < input.length) {
    const length = input.readUInt32BE(offset);
    const type = input.subarray(offset + 4, offset + 8).toString('ascii');
    const data = input.subarray(offset + 8, offset + 8 + length);
    chunks.push({ type, data });
    offset += 12 + length;
  }

  const ihdr = chunks.find((chunk) => chunk.type === 'IHDR')?.data;

  if (!ihdr) {
    throw new Error(`${path} is missing IHDR`);
  }

  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr.readUInt8(8);
  const colorType = ihdr.readUInt8(9);
  const compression = ihdr.readUInt8(10);
  const filter = ihdr.readUInt8(11);
  const interlace = ihdr.readUInt8(12);

  if (bitDepth !== 8 || compression !== 0 || filter !== 0 || interlace !== 0) {
    throw new Error(`${path} must be a non-interlaced 8-bit PNG`);
  }

  const channelsByColorType = new Map([
    [2, 3],
    [6, 4],
  ]);
  const channels = channelsByColorType.get(colorType);

  if (!channels) {
    throw new Error(`${path} must be RGB or RGBA`);
  }

  const idat = Buffer.concat(chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data));
  const raw = inflateSync(idat);
  const stride = width * channels;
  const pixels = Buffer.alloc(width * height * 4);
  let rawOffset = 0;
  let rgbaOffset = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filterType = raw.readUInt8(rawOffset);
    rawOffset += 1;
    const scanline = Buffer.from(raw.subarray(rawOffset, rawOffset + stride));
    rawOffset += stride;
    unfilterScanline(scanline, previous, channels, filterType);

    for (let x = 0; x < width; x += 1) {
      const src = x * channels;
      pixels[rgbaOffset] = scanline[src];
      pixels[rgbaOffset + 1] = scanline[src + 1];
      pixels[rgbaOffset + 2] = scanline[src + 2];
      pixels[rgbaOffset + 3] = channels === 4 ? scanline[src + 3] : 255;
      rgbaOffset += 4;
    }

    previous = scanline;
  }

  return { width, height, pixels };
}

function writePng(path, image) {
  mkdirSync(dirname(path), { recursive: true });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const encoded = Buffer.alloc((image.width * 4 + 1) * image.height);
  let encodedOffset = 0;
  let sourceOffset = 0;

  for (let y = 0; y < image.height; y += 1) {
    encoded[encodedOffset] = 0;
    encodedOffset += 1;
    image.pixels.copy(encoded, encodedOffset, sourceOffset, sourceOffset + image.width * 4);
    encodedOffset += image.width * 4;
    sourceOffset += image.width * 4;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const output = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(encoded, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(path, output);
}

function cropPng(image, x, y, width, height) {
  const pixels = Buffer.alloc(width * height * 4);

  for (let targetY = 0; targetY < height; targetY += 1) {
    const sourceStart = ((y + targetY) * image.width + x) * 4;
    const targetStart = targetY * width * 4;
    image.pixels.copy(pixels, targetStart, sourceStart, sourceStart + width * 4);
  }

  return { width, height, pixels };
}

function alphaBounds(image, threshold) {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = image.pixels[(y * image.width + x) * 4 + 3];

      if (alpha > threshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function containOnTransparentFrame(image, frameSize, anchorX, anchorY, options = {}) {
  const padded = Buffer.alloc(frameSize * frameSize * 4);
  const maxWidthRatio = options.maxWidthRatio ?? 0.72;
  const maxHeightRatio = options.maxHeightRatio ?? 0.82;
  const scale = Math.min(frameSize * maxWidthRatio / image.width, frameSize * maxHeightRatio / image.height);
  const scaledWidth = Math.max(1, Math.round(image.width * scale));
  const scaledHeight = Math.max(1, Math.round(image.height * scale));
  const scaled = cleanMatteAndIslands(resizePng(image, scaledWidth, scaledHeight));
  const x = Math.round(frameSize * anchorX - scaledWidth / 2);
  const y = Math.round(frameSize * anchorY - scaledHeight);

  blit({ width: frameSize, height: frameSize, pixels: padded }, scaled, x, y);
  return { width: frameSize, height: frameSize, pixels: padded };
}

function resizePng(image, width, height) {
  const pixels = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.floor((y / height) * image.height));

    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.floor((x / width) * image.width));
      const sourceIndex = (sourceY * image.width + sourceX) * 4;
      const targetIndex = (y * width + x) * 4;
      image.pixels.copy(pixels, targetIndex, sourceIndex, sourceIndex + 4);
    }
  }

  return { width, height, pixels };
}

function makeSheet(frames, frameCount, columns, rows, animationId) {
  const frame = frames[0];
  const sheet = {
    width: columns * frame.width,
    height: rows * frame.height,
    pixels: Buffer.alloc(columns * frame.width * rows * frame.height * 4),
  };

  for (let index = 0; index < frameCount; index += 1) {
    const currentFrame = frames[index % frames.length];
    const phase = frameCount <= 1 ? 0 : (index / (frameCount - 1)) * Math.PI * 2;
    const wobbleX = frames.length > 1 ? 0 : animationId === 'idle' ? Math.round(Math.sin(phase) * 4) : Math.round(Math.sin(phase) * 10);
    const wobbleY = frames.length > 1 ? 0 : ['search'].includes(animationId) ? Math.round(Math.sin(phase * 2) * 8) : 0;
    const column = index % columns;
    const row = Math.floor(index / columns);
    blit(sheet, currentFrame, column * frame.width + wobbleX, row * frame.height + wobbleY);
  }

  return sheet;
}

function cleanMatteAndIslands(image) {
  const cleaned = {
    width: image.width,
    height: image.height,
    pixels: Buffer.from(image.pixels),
  };

  for (let index = 0; index < cleaned.pixels.length; index += 4) {
    const red = cleaned.pixels[index];
    const green = cleaned.pixels[index + 1];
    const blue = cleaned.pixels[index + 2];
    const alpha = cleaned.pixels[index + 3];

    if (alpha === 0) {
      continue;
    }

    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const neutral = max - min <= 20;
    const warmFlashlight = red > 210 && green > 175 && blue < 150;

    if (!warmFlashlight && neutral && min >= 205) {
      cleaned.pixels[index + 3] = 0;
      continue;
    }

    if (!warmFlashlight && neutral && min >= 170) {
      cleaned.pixels[index + 3] = Math.min(alpha, Math.max(0, Math.round((205 - min) * 6)));
    }
  }

  removeSmallAlphaIslands(cleaned, 256);
  removeNeutralBoundaryHalo(cleaned, 3);
  return cleaned;
}

function stripBakedFlashlightLight(image) {
  for (let index = 0; index < image.pixels.length; index += 4) {
    const red = image.pixels[index];
    const green = image.pixels[index + 1];
    const blue = image.pixels[index + 2];
    const alpha = image.pixels[index + 3];

    if (alpha === 0) {
      continue;
    }

    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const paleWarmBeam = red >= 220 && green >= 195 && blue >= 135 && max - min <= 100;
    const hotWhiteBeam = red >= 235 && green >= 225 && blue >= 195;

    if (paleWarmBeam || hotWhiteBeam) {
      image.pixels[index + 3] = 0;
    }
  }

  removeSmallAlphaIslands(image, 256);
  removeNeutralBoundaryHalo(image, 2);
}

function matchStandingChildStyle(image) {
  const upperSkin = upperSkinBounds(image);

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const index = (y * image.width + x) * 4;
      const red = image.pixels[index];
      const green = image.pixels[index + 1];
      const blue = image.pixels[index + 2];
      const alpha = image.pixels[index + 3];

      if (alpha === 0) {
        continue;
      }

      const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
      let styledRed = clamp8(red * 0.64 + luminance * 0.32);
      let styledGreen = clamp8(green * 0.64 + luminance * 0.32);
      let styledBlue = clamp8(blue * 0.64 + luminance * 0.32);

      const upperHairBand = y < image.height * 0.36;
      const redScrunchie =
        upperHairBand && red >= 50 && green <= 90 && blue <= 75 && red > green + 12 && red > blue + 12;
      if (redScrunchie) {
        image.pixels[index] = Math.round(red * 0.24);
        image.pixels[index + 1] = Math.round(green * 0.24);
        image.pixels[index + 2] = Math.round(blue * 0.22);
        continue;
      }

      const warmSkin = red >= 125 && green >= 80 && blue >= 55 && red > green + 22 && green > blue + 8 && red <= 245;
      if (warmSkin) {
        styledRed = clamp8(red * 0.55 + luminance * 0.16);
        styledGreen = clamp8(green * 0.58 + luminance * 0.14);
        styledBlue = clamp8(blue * 0.6 + luminance * 0.12);
      }

      if (
        upperSkin &&
        isInsideEyeRegion(x, y, upperSkin) &&
        red < 62 &&
        green < 56 &&
        blue < 52 &&
        countSkinNeighbors(image, x, y) >= 1
      ) {
        styledRed = Math.max(styledRed, 66);
        styledGreen = Math.max(styledGreen, 54);
        styledBlue = Math.max(styledBlue, 44);
      }

      image.pixels[index] = styledRed;
      image.pixels[index + 1] = styledGreen;
      image.pixels[index + 2] = styledBlue;
    }
  }
}

function upperSkinBounds(image) {
  const pixelCount = image.width * image.height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let best = null;

  for (let start = 0; start < pixelCount; start += 1) {
    if (visited[start]) {
      continue;
    }

    const startX = start % image.width;
    const startY = Math.floor(start / image.width);

    if (startY >= image.height * 0.45 || !isFaceSkinPixel(image, startX, startY)) {
      visited[start] = 1;
      continue;
    }

    let head = 0;
    let tail = 0;
    const bounds = { minX: startX, minY: startY, maxX: startX, maxY: startY, pixels: 0 };
    visited[start] = 1;
    queue[tail] = start;
    tail += 1;

    while (head < tail) {
      const current = queue[head];
      head += 1;
      const x = current % image.width;
      const y = Math.floor(current / image.width);
      bounds.pixels += 1;
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.maxY = Math.max(bounds.maxY, y);

      const neighbors = [
        x > 0 ? current - 1 : -1,
        x < image.width - 1 ? current + 1 : -1,
        y > 0 ? current - image.width : -1,
        y < Math.floor(image.height * 0.45) ? current + image.width : -1,
      ];

      for (const neighbor of neighbors) {
        if (neighbor < 0 || visited[neighbor]) {
          continue;
        }

        const nx = neighbor % image.width;
        const ny = Math.floor(neighbor / image.width);
        visited[neighbor] = 1;

        if (isFaceSkinPixel(image, nx, ny)) {
          queue[tail] = neighbor;
          tail += 1;
        }
      }
    }

    if (bounds.pixels < 300) {
      continue;
    }

    if (!best || bounds.minY < best.minY || (bounds.minY === best.minY && bounds.pixels > best.pixels)) {
      best = bounds;
    }
  }

  return best;
}

function isInsideEyeRegion(x, y, bounds) {
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  return (
    x >= bounds.minX + width * 0.48 &&
    x <= bounds.minX + width * 0.86 &&
    y >= bounds.minY + height * 0.18 &&
    y <= bounds.minY + height * 0.52
  );
}

function isFaceSkinPixel(image, x, y) {
  const index = (y * image.width + x) * 4;
  const red = image.pixels[index];
  const green = image.pixels[index + 1];
  const blue = image.pixels[index + 2];
  const alpha = image.pixels[index + 3];
  return alpha > 48 && red >= 95 && green >= 60 && blue >= 40 && red > green + 14 && green > blue + 4;
}

function countSkinNeighbors(image, x, y) {
  let skinNeighbors = 0;

  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue;
      }

      const nx = x + dx;
      const ny = y + dy;

      if (nx < 0 || nx >= image.width || ny < 0 || ny >= image.height) {
        continue;
      }

      const index = (ny * image.width + nx) * 4;
      const red = image.pixels[index];
      const green = image.pixels[index + 1];
      const blue = image.pixels[index + 2];
      const alpha = image.pixels[index + 3];

      if (alpha > 48 && red >= 95 && green >= 60 && blue >= 40 && red > green + 14 && green > blue + 4) {
        skinNeighbors += 1;
      }
    }
  }

  return skinNeighbors;
}

function removeNeutralBoundaryHalo(image, passes) {
  for (let pass = 0; pass < passes; pass += 1) {
    const remove = [];

    for (let y = 0; y < image.height; y += 1) {
      for (let x = 0; x < image.width; x += 1) {
        const pixel = y * image.width + x;
        const pixelIndex = pixel * 4;

        if (image.pixels[pixelIndex + 3] === 0 || !touchesTransparentPixel(image, x, y)) {
          continue;
        }

        const red = image.pixels[pixelIndex];
        const green = image.pixels[pixelIndex + 1];
        const blue = image.pixels[pixelIndex + 2];
        const max = Math.max(red, green, blue);
        const min = Math.min(red, green, blue);
        const neutral = max - min <= 34;
        const warmFlashlight = red > 210 && green > 175 && blue < 150;

        if (!warmFlashlight && neutral && max >= 65) {
          remove.push(pixelIndex + 3);
        }
      }
    }

    for (const alphaIndex of remove) {
      image.pixels[alphaIndex] = 0;
    }
  }
}

function touchesTransparentPixel(image, x, y) {
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue;
      }

      const nx = x + dx;
      const ny = y + dy;

      if (nx < 0 || nx >= image.width || ny < 0 || ny >= image.height) {
        return true;
      }

      if (image.pixels[(ny * image.width + nx) * 4 + 3] === 0) {
        return true;
      }
    }
  }

  return false;
}

function removeSmallAlphaIslands(image, minPixels) {
  const pixelCount = image.width * image.height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);

  for (let start = 0; start < pixelCount; start += 1) {
    if (visited[start] || image.pixels[start * 4 + 3] === 0) {
      continue;
    }

    let head = 0;
    let tail = 0;
    visited[start] = 1;
    queue[tail] = start;
    tail += 1;

    while (head < tail) {
      const current = queue[head];
      head += 1;
      const x = current % image.width;
      const y = Math.floor(current / image.width);
      const neighbors = [
        x > 0 ? current - 1 : -1,
        x < image.width - 1 ? current + 1 : -1,
        y > 0 ? current - image.width : -1,
        y < image.height - 1 ? current + image.width : -1,
      ];

      for (const neighbor of neighbors) {
        if (neighbor < 0 || visited[neighbor] || image.pixels[neighbor * 4 + 3] === 0) {
          continue;
        }

        visited[neighbor] = 1;
        queue[tail] = neighbor;
        tail += 1;
      }
    }

    if (tail < minPixels) {
      for (let index = 0; index < tail; index += 1) {
        image.pixels[queue[index] * 4 + 3] = 0;
      }
    }
  }
}

function removeDetachedLowerRightArtifact(image) {
  removeDetachedAlphaComponents(image, (component) => {
    const lowerRight = component.minX > image.width * 0.7 && component.minY > image.height * 0.75;
    return lowerRight && component.pixels > 500;
  });
}

function removeDetachedAlphaComponents(image, shouldRemove) {
  const pixelCount = image.width * image.height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);

  for (let start = 0; start < pixelCount; start += 1) {
    if (visited[start] || image.pixels[start * 4 + 3] === 0) {
      continue;
    }

    let head = 0;
    let tail = 0;
    const component = {
      pixels: 0,
      minX: start % image.width,
      minY: Math.floor(start / image.width),
      maxX: start % image.width,
      maxY: Math.floor(start / image.width),
    };
    visited[start] = 1;
    queue[tail] = start;
    tail += 1;

    while (head < tail) {
      const current = queue[head];
      head += 1;
      const x = current % image.width;
      const y = Math.floor(current / image.width);
      component.pixels += 1;
      component.minX = Math.min(component.minX, x);
      component.minY = Math.min(component.minY, y);
      component.maxX = Math.max(component.maxX, x);
      component.maxY = Math.max(component.maxY, y);

      const neighbors = [
        x > 0 ? current - 1 : -1,
        x < image.width - 1 ? current + 1 : -1,
        y > 0 ? current - image.width : -1,
        y < image.height - 1 ? current + image.width : -1,
      ];

      for (const neighbor of neighbors) {
        if (neighbor < 0 || visited[neighbor] || image.pixels[neighbor * 4 + 3] === 0) {
          continue;
        }

        visited[neighbor] = 1;
        queue[tail] = neighbor;
        tail += 1;
      }
    }

    if (shouldRemove(component)) {
      for (let index = 0; index < tail; index += 1) {
        image.pixels.fill(0, queue[index] * 4, queue[index] * 4 + 4);
      }
    }
  }
}

function blit(target, source, targetX, targetY) {
  for (let y = 0; y < source.height; y += 1) {
    const destinationY = targetY + y;

    if (destinationY < 0 || destinationY >= target.height) {
      continue;
    }

    for (let x = 0; x < source.width; x += 1) {
      const destinationX = targetX + x;

      if (destinationX < 0 || destinationX >= target.width) {
        continue;
      }

      const sourceIndex = (y * source.width + x) * 4;
      const alpha = source.pixels[sourceIndex + 3];

      if (alpha === 0) {
        continue;
      }

      const targetIndex = (destinationY * target.width + destinationX) * 4;
      source.pixels.copy(target.pixels, targetIndex, sourceIndex, sourceIndex + 4);
    }
  }
}

function unfilterScanline(scanline, previous, bytesPerPixel, filterType) {
  for (let index = 0; index < scanline.length; index += 1) {
    const left = index >= bytesPerPixel ? scanline[index - bytesPerPixel] : 0;
    const up = previous[index] ?? 0;
    const upperLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0;

    switch (filterType) {
      case 0:
        break;
      case 1:
        scanline[index] = (scanline[index] + left) & 0xff;
        break;
      case 2:
        scanline[index] = (scanline[index] + up) & 0xff;
        break;
      case 3:
        scanline[index] = (scanline[index] + Math.floor((left + up) / 2)) & 0xff;
        break;
      case 4:
        scanline[index] = (scanline[index] + paeth(left, up, upperLeft)) & 0xff;
        break;
      default:
        throw new Error(`Unsupported PNG filter type ${filterType}`);
    }
  }
}

function paeth(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);

  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) {
    return left;
  }

  if (upDistance <= upperLeftDistance) {
    return up;
  }

  return upperLeft;
}

function chunk(type, data) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 0);
  header.write(type, 4, 4, 'ascii');
  const crcInput = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const footer = Buffer.alloc(4);
  footer.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([header, data, footer]);
}

function clamp8(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function crc32(data) {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
