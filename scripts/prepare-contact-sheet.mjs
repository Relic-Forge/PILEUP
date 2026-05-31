import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  throw new Error('Usage: node scripts/prepare-contact-sheet.mjs <input.png> <output.png>');
}

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const input = readFileSync(inputPath);

if (!input.subarray(0, 8).equals(signature)) {
  throw new Error(`${inputPath} is not a PNG file`);
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
  throw new Error(`${inputPath} is missing IHDR`);
}

const width = ihdr.readUInt32BE(0);
const height = ihdr.readUInt32BE(4);
const bitDepth = ihdr.readUInt8(8);
const colorType = ihdr.readUInt8(9);
const compression = ihdr.readUInt8(10);
const filter = ihdr.readUInt8(11);
const interlace = ihdr.readUInt8(12);

if (bitDepth !== 8 || compression !== 0 || filter !== 0 || interlace !== 0) {
  throw new Error(`${inputPath} must be a non-interlaced 8-bit PNG`);
}

const channelsByColorType = new Map([
  [2, 3],
  [6, 4],
]);
const channels = channelsByColorType.get(colorType);

if (!channels) {
  throw new Error(`${inputPath} must be RGB or RGBA`);
}

const idat = Buffer.concat(chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data));
const raw = inflateSync(idat);
const stride = width * channels;
const rgba = Buffer.alloc(width * height * 4);
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
    const red = scanline[src];
    const green = scanline[src + 1];
    const blue = scanline[src + 2];
    const sourceAlpha = channels === 4 ? scanline[src + 3] : 255;
    const alpha = isGeneratedCheckerPixel(red, green, blue) ? 0 : sourceAlpha;

    rgba[rgbaOffset] = red;
    rgba[rgbaOffset + 1] = green;
    rgba[rgbaOffset + 2] = blue;
    rgba[rgbaOffset + 3] = alpha;
    rgbaOffset += 4;
  }

  previous = scanline;
}

const encoded = Buffer.alloc((width * 4 + 1) * height);
let encodedOffset = 0;
let sourceOffset = 0;

for (let y = 0; y < height; y += 1) {
  encoded[encodedOffset] = 0;
  encodedOffset += 1;
  rgba.copy(encoded, encodedOffset, sourceOffset, sourceOffset + width * 4);
  encodedOffset += width * 4;
  sourceOffset += width * 4;
}

const outputIhdr = Buffer.from(ihdr);
outputIhdr.writeUInt8(6, 9);
const output = Buffer.concat([
  signature,
  chunk('IHDR', outputIhdr),
  chunk('IDAT', deflateSync(encoded, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

writeFileSync(outputPath, output);
console.log(`Prepared RGBA contact sheet: ${outputPath} (${width}x${height})`);

function isGeneratedCheckerPixel(red, green, blue) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  return max >= 230 && max - min <= 12;
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
