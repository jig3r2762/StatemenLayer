import archiver from "archiver";
import { PassThrough } from "stream";

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\/\\:]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export async function buildBatchZip(
  pdfs: Array<{ filename: string; buffer: Buffer }>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 6 } });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    stream.on("error", (error) => {
      reject(error);
    });

    archive.on("error", (error) => {
      reject(error);
    });

    archive.pipe(stream);

    for (const pdf of pdfs) {
      archive.append(pdf.buffer, { name: sanitizeFilename(pdf.filename) });
    }

    void archive.finalize();
  });
}
