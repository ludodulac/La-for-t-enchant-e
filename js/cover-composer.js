// cover-composer.js — composition isolée des couvertures administrateur.
(() => {
  const SIZE = 600;
  const DEFAULT_BG = '#8FC9A6';
  const ARTWORK_BOX = 440;

  function normalizeHex(value) {
    const raw = String(value || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toUpperCase();
    if (/^#[0-9a-f]{3}$/i.test(raw)) {
      return ('#' + raw.slice(1).split('').map(char => char + char).join('')).toUpperCase();
    }
    return DEFAULT_BG;
  }

  function relativeLuminance(hex) {
    const value = normalizeHex(hex).slice(1);
    const parts = [0, 2, 4].map(offset => parseInt(value.slice(offset, offset + 2), 16) / 255);
    const linear = parts.map(channel => channel <= 0.04045
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4));
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }

  function chooseInk(hex) {
    const luminance = relativeLuminance(hex);
    const whiteContrast = 1.05 / (luminance + 0.05);
    const blackContrast = (luminance + 0.05) / 0.05;
    return whiteContrast >= blackContrast ? '#FFFFFF' : '#111426';
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Illustration impossible à charger.'));
      image.src = url;
    });
  }

  async function render({ canvas, illustrationUrl, color, framing = {} }) {
    if (!canvas) throw new Error('Canvas manquant.');
    if (!illustrationUrl) throw new Error('Illustration manquante.');

    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    const background = normalizeHex(color);
    const ink = chooseInk(background);
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, SIZE, SIZE);

    const image = await loadImage(illustrationUrl);
    const opticalScale = Number(framing.scale) || 1;
    const offsetX = Number(framing.offsetX) || 0;
    const offsetY = Number(framing.offsetY) || 0;
    const baseScale = Math.min(ARTWORK_BOX / image.width, ARTWORK_BOX / image.height) * opticalScale;
    const drawW = image.width * baseScale;
    const drawH = image.height * baseScale;
    const drawX = (SIZE - drawW) / 2 + offsetX * SIZE;
    const drawY = (SIZE - drawH) / 2 + offsetY * SIZE;

    const mask = document.createElement('canvas');
    mask.width = SIZE;
    mask.height = SIZE;
    const maskCtx = mask.getContext('2d');
    maskCtx.drawImage(image, drawX, drawY, drawW, drawH);
    maskCtx.globalCompositeOperation = 'source-in';
    maskCtx.fillStyle = ink;
    maskCtx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(mask, 0, 0);

    return { background, ink, drawX, drawY, drawW, drawH };
  }

  function toBlob(canvas, type = 'image/png', quality = 0.94) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Impossible de générer la couverture.')), type, quality);
    });
  }

  window.ForestCoverComposer = { SIZE, normalizeHex, chooseInk, render, toBlob };
})();
