// pdf.js로 PDF 파일을 슬라이드별 JPEG 이미지(Blob)로 변환한다. 클라이언트 전용.

const THUMB_WIDTH = 800;
const JPEG_QUALITY = 0.85;

export interface PdfPageImage {
  page_no: number;
  blob: Blob;
}

export async function convertPdfToImages(
  file: File,
  onProgress?: (current: number, total: number) => void,
): Promise<PdfPageImage[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const images: PdfPageImage[] = [];

  try {
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      const page = await pdf.getPage(pageNo);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = THUMB_WIDTH / baseViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);

      await page.render({ canvas, viewport }).promise;

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
      });
      if (!blob) {
        throw new Error(`${pageNo}페이지 이미지 변환에 실패했습니다.`);
      }

      images.push({ page_no: pageNo, blob });
      onProgress?.(pageNo, pdf.numPages);
    }
  } finally {
    await loadingTask.destroy();
  }

  return images;
}
