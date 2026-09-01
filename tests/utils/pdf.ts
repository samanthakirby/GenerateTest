import { readFile } from 'node:fs/promises';

export async function extractPdfText(filePath: string): Promise<string> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: await readFile(filePath) });

  try {
    const { text } = await parser.getText();
    return text.replace(/\s+/g, ' ');
  } finally {
    await parser.destroy();
  }
}
