import { toPng } from "html-to-image";
import { saveAs } from "file-saver";

export async function exportPng(node: HTMLElement, filename: string) {
  const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  saveAs(blob, filename);
}
