const sharp = require('sharp');
const path = require('path');

const input = path.resolve(__dirname, '../assets/imgs/app-logo.png');
const output = path.resolve(__dirname, '../assets/imgs/icon-padded.png');

async function addPadding() {
  try {
    const image = sharp(input);
    const metadata = await image.metadata();
    const width = metadata.width;
    const height = metadata.height;
    
    // Add 15% padding (reduced from 35%)
    const padding = Math.round(width * 0.15); 
    
    console.log(`Original size: ${width}x${height}, adding padding: ${padding}px`);

    await image
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .toFile(output);
      
    console.log(`✅ Created padded icon: ${output}`);
  } catch (err) {
    console.error("Error processing image:", err);
  }
}

addPadding();