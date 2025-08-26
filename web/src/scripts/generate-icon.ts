import sharp from 'sharp';
import * as path from 'path';

async function generateIcons() {
  const publicPath = path.join(__dirname, '../../public');
  
  // 日本の国旗をベースにした簡単なアイコンを生成
  const svgIcon = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="#ffffff"/>
      <circle cx="256" cy="256" r="150" fill="#e60012"/>
      <text x="256" y="450" font-family="Arial" font-size="48" font-weight="bold" text-anchor="middle" fill="#333">
        守ろうJAPAN
      </text>
    </svg>
  `;

  try {
    // 192x192のアイコンを生成
    await sharp(Buffer.from(svgIcon))
      .resize(192, 192)
      .png()
      .toFile(path.join(publicPath, 'icons', 'icon-192.png'));
    
    console.log('✅ Generated icon-192.png');

    // 512x512のアイコンを生成
    await sharp(Buffer.from(svgIcon))
      .resize(512, 512)
      .png()
      .toFile(path.join(publicPath, 'icons', 'icon-512.png'));
    
    console.log('✅ Generated icon-512.png');

    // faviconも生成
    await sharp(Buffer.from(svgIcon))
      .resize(32, 32)
      .png()
      .toFile(path.join(publicPath, 'favicon.png'));
    
    console.log('✅ Generated favicon.png');

  } catch (error) {
    console.error('Failed to generate icons:', error);
  }
}

generateIcons();