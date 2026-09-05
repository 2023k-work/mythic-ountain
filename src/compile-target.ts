import { Compiler } from 'mind-ar/dist/mindar-image.prod.js';

declare global {
  interface Window {
    __mindTargetBuffer?: number[];
  }
}

const progress = document.querySelector<HTMLDivElement>('#progress')!;
const result = document.querySelector<HTMLDivElement>('#result')!;
const image = new Image();
image.src = `${import.meta.env.BASE_URL}targets/M1.jpg`;

image.onload = async () => {
  try {
    const compiler = new Compiler();
    await compiler.compileImageTargets([image], (value) => {
      progress.textContent = `Compiling M1: ${Math.round(value)}%`;
    });
    const buffer = compiler.exportData();
    const blob = new Blob([buffer as unknown as BlobPart], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'M1.mind';
    link.textContent = 'Download M1.mind';
    result.append(link);
    window.__mindTargetBuffer = Array.from(buffer);
    progress.textContent = `Complete (${Math.round(buffer.byteLength / 1024)} KB)`;
  } catch (error) {
    progress.textContent = 'Compiler failed';
    result.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
  }
};

image.onerror = () => {
  progress.textContent = 'Could not load M1.jpg';
};
