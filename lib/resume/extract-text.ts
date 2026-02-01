import mammoth from 'mammoth';
import { extractText } from 'unpdf';

const PDF_MIME = 'application/pdf';
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export async function extractResumeText(
  buffer: Buffer,
  mimeType: string
): Promise<string | null> {
  try {
    if (mimeType === PDF_MIME) {
      const { text } = await extractText(new Uint8Array(buffer), {
        mergePages: true,
      });
      return typeof text === 'string' ? text.trim() || null : null;
    }
    if (mimeType === DOCX_MIME) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value?.trim() || null;
    }
    return null;
  } catch (error) {
    console.error('Resume text extraction error:', error);
    return null;
  }
}
