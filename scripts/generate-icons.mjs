import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

/**
 * Gera os ícones do PWA a partir de `logo.jpg` (raiz do projeto).
 * Rode com: `npm run icons`
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.join(root, "logo.jpg");
const outDir = path.join(root, "public", "icons");

const BRAND_BG = "#ffffff"; // fundo dos ícones "maskable"/apple

async function main() {
  await mkdir(outDir, { recursive: true });

  // Ícones "any" — logo cheio, fundo branco.
  for (const size of [192, 512]) {
    await sharp(src)
      .resize(size, size, { fit: "contain", background: BRAND_BG })
      .flatten({ background: BRAND_BG })
      .png()
      .toFile(path.join(outDir, `icon-${size}.png`));
  }

  // Maskable — logo com ~16% de respiro (safe zone) sobre fundo branco.
  for (const size of [192, 512]) {
    const inner = Math.round(size * 0.68);
    const logo = await sharp(src)
      .resize(inner, inner, { fit: "contain", background: BRAND_BG })
      .flatten({ background: BRAND_BG })
      .toBuffer();
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: BRAND_BG,
      },
    })
      .composite([{ input: logo, gravity: "center" }])
      .png()
      .toFile(path.join(outDir, `icon-maskable-${size}.png`));
  }

  // Apple touch icon (180x180, fundo branco, sem transparência).
  await sharp(src)
    .resize(180, 180, { fit: "contain", background: BRAND_BG })
    .flatten({ background: BRAND_BG })
    .png()
    .toFile(path.join(outDir, "apple-touch-icon.png"));

  // Favicon PNG (32x32).
  await sharp(src)
    .resize(32, 32, { fit: "contain", background: BRAND_BG })
    .flatten({ background: BRAND_BG })
    .png()
    .toFile(path.join(outDir, "favicon-32.png"));

  // Badge das notificações (Android): silhueta BRANCA sobre transparente da
  // figura do logo (parte esquerda). O Android usa só o canal alfa.
  const { width, height } = await sharp(src).metadata();
  const figura = await sharp(src)
    // (margem de 12px: o JPG tem cantos escuros arredondados)
    .extract({ left: 12, top: 12, width: Math.round(width * 0.27) - 12, height: height - 24 })
    .resize(72, 72, { fit: "contain", background: "#ffffff" })
    .flatten({ background: "#ffffff" })
    .greyscale()
    // (o sharp aplica threshold ANTES do negate, seja qual for a ordem aqui)
    .threshold(225) // fundo branco = 255, figura = 0
    .negate() // inverte: figura opaca, fundo transparente
    .toColourspace("b-w")
    .raw()
    .toBuffer();
  await sharp({
    create: { width: 72, height: 72, channels: 3, background: "#ffffff" },
  })
    .joinChannel(figura, { raw: { width: 72, height: 72, channels: 1 } })
    .png()
    .toFile(path.join(outDir, "badge-72.png"));

  console.log("Ícones gerados em public/icons/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
