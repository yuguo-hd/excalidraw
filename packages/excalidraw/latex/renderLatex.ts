import katex from "katex";

import { nanoid } from "nanoid";

import { IMAGE_MIME_TYPES } from "@excalidraw/common";

import type { FileId } from "@excalidraw/element/types";

import type { BinaryFileData, DataURL } from "../types";

export interface LatexRenderResult {
  fileId: FileId;
  dataURL: string;
  mimeType: typeof IMAGE_MIME_TYPES.svg;
  width: number;
  height: number;
}

/**
 * Renders LaTeX code to SVG using KaTeX MathML output.
 * MathML is rendered by the browser's native math engine — no external CSS or
 * fonts are needed, so the SVG works correctly when drawn to a canvas.
 */
export const renderLatexToSvg = (
  latex: string,
  displayMode: boolean = true,
): string => {
  // MathML output doesn't depend on KaTeX CSS or fonts
  const mathmlOutput = katex.renderToString(latex, {
    displayMode,
    throwOnError: false,
    output: "mathml",
  });

  // Extract the <math> element to avoid any CSS-class wrappers
  const tmp = document.createElement("div");
  tmp.innerHTML = mathmlOutput;
  const mathEl = tmp.querySelector("math");
  const mathHtml = mathEl ? mathEl.outerHTML : mathmlOutput;

  // Measure using the browser's native MathML renderer
  const container = document.createElement("div");
  container.style.cssText =
    "position:absolute;top:-9999px;left:-9999px;visibility:hidden;white-space:nowrap;";
  container.innerHTML = mathHtml;
  document.body.appendChild(container);

  const rect = container.getBoundingClientRect();
  const svgWidth = Math.max(Math.ceil(rect.width), 10);
  const svgHeight = Math.max(Math.ceil(rect.height), 10);

  document.body.removeChild(container);

  // Embed MathML in SVG — self-contained, no external dependencies
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml">
        ${mathHtml}
      </div>
    </foreignObject>
  </svg>`;

  return svg;
};

/**
 * Renders LaTeX code and returns file data for storage
 */
export const renderLatexToFile = async (
  latex: string,
  displayMode: boolean = true,
): Promise<LatexRenderResult> => {
  const svg = renderLatexToSvg(latex, displayMode);

  // Convert SVG to data URL
  const dataURL = `data:${IMAGE_MIME_TYPES.svg};base64,${btoa(
    unescape(encodeURIComponent(svg)),
  )}`;

  // Create an image to get dimensions
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load LaTeX image"));
    img.src = dataURL;
  });

  return {
    fileId: nanoid() as FileId,
    dataURL,
    mimeType: IMAGE_MIME_TYPES.svg,
    width: img.naturalWidth || 100,
    height: img.naturalHeight || 50,
  };
};

/**
 * Creates a BinaryFileData object from LaTeX render result
 */
export const createLatexFileData = (
  result: LatexRenderResult,
): BinaryFileData => {
  return {
    id: result.fileId,
    dataURL: result.dataURL as DataURL,
    mimeType: result.mimeType,
    created: Date.now(),
  };
};

/**
 * Loads a LaTeX SVG into an HTMLImageElement for the image cache
 */
export const loadLatexImage = (dataURL: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load LaTeX image"));
    img.src = dataURL;
  });
};
