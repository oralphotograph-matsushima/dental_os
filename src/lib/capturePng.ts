import * as htmlToImage from "html-to-image";

export async function captureTransparentPng(el: HTMLElement): Promise<string> {
  el.classList.add("png-export");
  try {
    const imgs = Array.from(el.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            })
      )
    );
    return await htmlToImage.toPng(el, {
      pixelRatio: 2,
      cacheBust: true,
      skipFonts: true,
      filter: (node) => !(node instanceof Element && node.classList.contains("export-ignore")),
    });
  } finally {
    el.classList.remove("png-export");
  }
}
