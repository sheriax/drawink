
import sharp from 'sharp';

const logoDir = '/Users/ryan/Desktop/projects/drawink/src/core/components/assets/logo/';
const files = [
    'drawink-logo-white-bg.png',
    'drawink-logo-text-white-bg.png'
];

async function analyze(filename) {
    const filePath = logoDir + filename;
    const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });

    // Check top-left pixel
    const r = data[0];
    const g = data[1];
    const b = data[2];

    console.log(`${filename}: Top-left pixel is RGB(${r}, ${g}, ${b})`);

    // Sample some more pixels
    let whitePixels = 0;
    let blackPixels = 0;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) whitePixels++;
        if (data[i] < 50 && data[i + 1] < 50 && data[i + 2] < 50) blackPixels++;
    }
    console.log(`${filename}: White pixels: ${whitePixels}, Black pixels: ${blackPixels}, Total: ${info.width * info.height}`);
}

async function main() {
    for (const f of files) {
        await analyze(f);
    }
}
main();
