import { Compiler } from 'mind-ar/dist/mindar-image.prod.js';

declare global {
  interface Window {
    __mindTargetBuffer?: number[];
  }
}

const progress = document.querySelector<HTMLDivElement>('#progress')!;
const result = document.querySelector<HTMLDivElement>('#result')!;
const targetNames = ['M1', 'M2', 'M3', 'M4', 'M5'];

function loadTargetImage(name: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${name}.jpg`));
    image.src = `${import.meta.env.BASE_URL}targets/${name}.jpg`;
  });
}

void Promise.all(targetNames.map(loadTargetImage)).then(async (images) => {
  try {
    const compiler = new Compiler();
    await compiler.compileImageTargets(images, (value) => {
      progress.textContent = `Compiling M1-M5: ${Math.round(value)}%`;
    });
    const buffer = compiler.exportData();
    const blob = new Blob([buffer as unknown as BlobPart], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'M1-M5.mind';
    link.textContent = 'Download M1-M5.mind';
    result.append(link);
    window.__mindTargetBuffer = Array.from(buffer);
    progress.textContent = `Complete (${Math.round(buffer.byteLength / 1024)} KB)`;
  } catch (error) {
    progress.textContent = 'Compiler failed';
    result.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
  }
}).catch((error: unknown) => {
  progress.textContent = 'Could not load target images';
  result.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
});
