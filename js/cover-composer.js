// cover-composer.js — composition isolée des couvertures administrateur.
(() => {
  const SIZE = 600;
  const DEFAULT_BG = '#8FC9A6';

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

  function wrapTitle(ctx, title, maxWidth, maxLines, maxSize, minSize) {
    const words = String(title || 'Sans titre').trim().split(/\s+/).filter(Boolean);
    const safeWords = words.length ? words : ['Sans', 'titre'];
    let fallback = null;

    for (let size = maxSize; size >= minSize; size -= 2) {
      ctx.font = `900 ${size}px Nunito, Inter, sans-serif`;
      const lines = [];
      let current = '';
      safeWords.forEach(word => {
        const candidate = current ? `${current} ${word}` : word;
        if (!current || ctx.measureText(candidate).width <= maxWidth) {
          current = candidate;
        } else {
          lines.push(current);
          current = word;
        }
      });
      if (current) lines.push(current);
      fallback = { size, lines };
      if (lines.length <= maxLines) return fallback;
    }

    return { size: minSize, lines: fallback.lines.slice(0, maxLines) };
  }

  async function render({ canvas, title, illustrationUrl, color, framing = {} }) {
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

    const visualTop = 48;
    const visualHeight = 310;
    const visualWidth = 430;
    const baseScale = Math.min(visualWidth / image.width, visualHeight / image.height) * opticalScale;
    const drawW = image.width * baseScale;
    const drawH = image.height * baseScale;
    const drawX = (SIZE - drawW) / 2 + offsetX * SIZE;
    const drawY = visualTop + (visualHeight - drawH) / 2 + offsetY * SIZE;

    const mask = document.createElement('canvas');
    mask.width = SIZE;
    mask.height = SIZE;
    const maskCtx = mask.getContext('2d');
    maskCtx.drawImage(image, drawX, drawY, drawW, drawH);
    maskCtx.globalCompositeOperation = 'source-in';
    maskCtx.fillStyle = ink;
    maskCtx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(mask, 0, 0);

    const marginX = 48;
    const titleTop = 405;
    const titleBottom = 554;
    const titleBoxHeight = titleBottom - titleTop;
    const wrapped = wrapTitle(ctx, title, SIZE - marginX * 2, 3, 54, 34);
    const lineHeight = Math.round(wrapped.size * 1.05);
    const blockHeight = wrapped.lines.length * lineHeight;
    let y = titleTop + Math.max(0, (titleBoxHeight - blockHeight) / 2);

    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `900 ${wrapped.size}px Nunito, Inter, sans-serif`;
    wrapped.lines.forEach(line => {
      ctx.fillText(line, marginX, y);
      y += lineHeight;
    });

    return { background, ink, lines: wrapped.lines, fontSize: wrapped.size };
  }

  function toBlob(canvas, type = 'image/png', quality = 0.94) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Impossible de générer la couverture.')), type, quality);
    });
  }

  window.ForestCoverComposer = { SIZE, normalizeHex, chooseInk, render, toBlob };
})();
