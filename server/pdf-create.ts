import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts, PDFTextField, PDFCheckBox, PDFDropdown } from "pdf-lib";
import fs from "fs";
import path from "path";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { fileStorage } from "@shared/schema";
import { uploadAndShare } from "./google-drive";

const WORKSPACE_ROOT = process.cwd();
const OUTPUT_DIR = path.join(WORKSPACE_ROOT, "uploads");

async function persistToDb(filename: string, originalName: string, pdfBytes: Uint8Array) {
  try {
    console.log(`[pdf] Persisting ${filename} to DB (${pdfBytes.length} bytes)...`);
    const base64 = Buffer.from(pdfBytes).toString("base64");
    const existing = await db.select({ id: fileStorage.id }).from(fileStorage).where(eq(fileStorage.filename, filename)).limit(1);
    if (existing.length > 0) {
      await db.update(fileStorage).set({
        originalName,
        mimeType: "application/pdf",
        size: pdfBytes.length,
        data: base64,
      }).where(eq(fileStorage.filename, filename));
      console.log(`[pdf] Updated existing DB record for ${filename}`);
    } else {
      await db.insert(fileStorage).values({
        filename,
        originalName,
        mimeType: "application/pdf",
        size: pdfBytes.length,
        data: base64,
      });
      console.log(`[pdf] Persisted ${filename} to DB successfully`);
    }
  } catch (err: any) {
    console.error("[pdf] DB persist failed:", err.message, err.stack);
  }
}

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function safePath(filePath: string): string {
  const resolved = path.resolve(WORKSPACE_ROOT, filePath);
  if (!resolved.startsWith(WORKSPACE_ROOT)) throw new Error("Path escapes workspace");
  return resolved;
}

function resolveUploadPath(filePath: string): string {
  if (filePath.startsWith("/uploads/")) {
    return path.join(WORKSPACE_ROOT, filePath);
  }
  if (filePath.startsWith("uploads/")) {
    return path.join(WORKSPACE_ROOT, filePath);
  }
  const inUploads = path.join(WORKSPACE_ROOT, "uploads", filePath);
  if (fs.existsSync(inUploads)) return inUploads;
  const direct = path.resolve(WORKSPACE_ROOT, filePath);
  if (direct.startsWith(WORKSPACE_ROOT)) return direct;
  return inUploads;
}

interface FieldDef {
  name: string;
  type: "text" | "checkbox" | "dropdown";
  label?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  value?: string;
  options?: string[];
  required?: boolean;
  fontSize?: number;
  multiline?: boolean;
}

interface HeaderImageDef {
  path: string;
  width?: number;
  height?: number;
  alignment?: "left" | "center" | "right";
}

interface CreatePdfParams {
  title?: string;
  content?: string;
  sections?: { heading?: string; body: string }[];
  fields?: FieldDef[];
  headerImage?: HeaderImageDef;
  fontSize?: number;
  pageSize?: "letter" | "a4" | "legal";
  outputPath?: string;
  customerName?: string;
  folderLabel?: string;
}

interface FillPdfParams {
  inputPath: string;
  fields: Record<string, string | boolean>;
  outputPath?: string;
  flatten?: boolean;
}

interface EditPdfParams {
  inputPath: string;
  addText?: { text: string; x: number; y: number; page?: number; fontSize?: number; color?: string }[];
  addFields?: FieldDef[];
  addPages?: number;
  removePages?: number[];
  outputPath?: string;
}

const PAGE_SIZES = {
  letter: { width: 612, height: 792 } as const,
  a4: { width: 595.28, height: 841.89 } as const,
  legal: { width: 612, height: 1008 } as const,
};

function parseColor(color?: string) {
  if (!color) return rgb(0, 0, 0);
  const hex = color.replace("#", "");
  if (hex.length === 6) {
    return rgb(
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255
    );
  }
  return rgb(0, 0, 0);
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(test, fontSize);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function sanitizeForPdf(text: string): string {
  const replacements: Record<string, string> = {
    '\u2713': '[x]',  // ✓
    '\u2714': '[x]',  // ✔
    '\u2715': '[ ]',  // ✕
    '\u2716': '[ ]',  // ✖
    '\u2717': '[ ]',  // ✗
    '\u2718': '[ ]',  // ✘
    '\u2022': '*',    // •
    '\u2023': '>',    // ‣
    '\u25B8': '>',    // ▸
    '\u25BA': '>',    // ►
    '\u25CF': '*',    // ●
    '\u25CB': 'o',    // ○
    '\u25A0': '#',    // ■
    '\u25A1': '[]',   // □
    '\u2192': '->',   // →
    '\u2190': '<-',   // ←
    '\u2191': '^',    // ↑
    '\u2193': 'v',    // ↓
    '\u21D2': '=>',   // ⇒
    '\u2014': '--',   // —
    '\u2013': '-',    // –
    '\u2018': "'",    // '
    '\u2019': "'",    // '
    '\u201C': '"',    // "
    '\u201D': '"',    // "
    '\u2026': '...',  // …
    '\u00A0': ' ',    // non-breaking space
    '\u2212': '-',    // −
    '\u2264': '<=',   // ≤
    '\u2265': '>=',   // ≥
    '\u2260': '!=',   // ≠
    '\u221E': 'inf',  // ∞
    '\u2248': '~=',   // ≈
    '\u00B7': '*',    // ·
    '\u2605': '*',    // ★
    '\u2606': '*',    // ☆
  };

  let result = text;
  for (const [unicode, ascii] of Object.entries(replacements)) {
    result = result.split(unicode).join(ascii);
  }
  // eslint-disable-next-line no-control-regex
  result = result.replace(/[^\x00-\xFF]/g, '?');
  return result;
}

export async function createPdf(params: CreatePdfParams): Promise<{ success: boolean; path?: string; url?: string; pages?: number; fields?: number; error?: string }> {
  try {
    ensureOutputDir();
    const doc = await PDFDocument.create();
    const size = PAGE_SIZES[params.pageSize || "letter"];
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const baseFontSize = params.fontSize || 12;
    const margin = 50;
    const maxWidth = size.width - margin * 2;

    if (params.title) {
      doc.setTitle(params.title);
      doc.setProducer("VisionClaw Agent");
      doc.setCreator("VisionClaw PDF Toolkit");
    }

    let page = doc.addPage([size.width, size.height]);
    let yPos = size.height - margin;
    let embeddedHeaderImage: { image: any; width: number; height: number; alignment: string } | null = null;

    if (params.headerImage) {
      try {
        const imgPath = resolveUploadPath(params.headerImage.path);
        if (fs.existsSync(imgPath)) {
          const imgBytes = fs.readFileSync(imgPath);
          const ext = path.extname(imgPath).toLowerCase();
          let image;
          if (ext === ".png") {
            image = await doc.embedPng(imgBytes);
          } else if (ext === ".jpg" || ext === ".jpeg") {
            image = await doc.embedJpg(imgBytes);
          } else {
            console.warn(`[pdf] Unsupported image format: ${ext}, trying as PNG`);
            try { image = await doc.embedPng(imgBytes); } catch { image = await doc.embedJpg(imgBytes); }
          }
          const origW = image.width;
          const origH = image.height;
          let drawW = params.headerImage.width || Math.min(origW, maxWidth);
          let drawH = params.headerImage.height || (drawW / origW) * origH;
          if (drawW > maxWidth) {
            drawH = (maxWidth / drawW) * drawH;
            drawW = maxWidth;
          }
          embeddedHeaderImage = { image, width: drawW, height: drawH, alignment: params.headerImage.alignment || "center" };
        } else {
          console.warn(`[pdf] Header image not found: ${imgPath}`);
        }
      } catch (imgErr: any) {
        console.warn(`[pdf] Failed to embed header image: ${imgErr.message}`);
      }
    }

    function drawHeaderImage() {
      if (!embeddedHeaderImage) return;
      const { image, width: drawW, height: drawH, alignment } = embeddedHeaderImage;
      let imgX = margin;
      if (alignment === "center") imgX = (size.width - drawW) / 2;
      else if (alignment === "right") imgX = size.width - margin - drawW;
      page.drawImage(image, { x: imgX, y: yPos - drawH, width: drawW, height: drawH });
      yPos -= drawH + 15;
    }

    function ensureSpace(needed: number) {
      if (yPos - needed < margin) {
        page = doc.addPage([size.width, size.height]);
        yPos = size.height - margin;
        drawHeaderImage();
      }
    }

    drawHeaderImage();

    if (params.title) {
      const titleSize = baseFontSize + 8;
      ensureSpace(titleSize + 20);
      page.drawText(sanitizeForPdf(params.title), { x: margin, y: yPos, size: titleSize, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
      yPos -= titleSize + 20;
    }

    if (params.content) {
      const paragraphs = sanitizeForPdf(params.content).split("\n");
      for (const para of paragraphs) {
        if (!para.trim()) { yPos -= baseFontSize; continue; }
        const lines = wrapText(para, font, baseFontSize, maxWidth);
        for (const line of lines) {
          ensureSpace(baseFontSize + 4);
          page.drawText(line, { x: margin, y: yPos, size: baseFontSize, font, color: rgb(0.15, 0.15, 0.15) });
          yPos -= baseFontSize + 4;
        }
        yPos -= 4;
      }
    }

    let parsedSections = params.sections;
    if (parsedSections && typeof parsedSections === "string") {
      try {
        parsedSections = JSON.parse(parsedSections);
      } catch {
        parsedSections = [{ heading: "Content", body: parsedSections }];
      }
    }
    if (parsedSections && !Array.isArray(parsedSections)) {
      parsedSections = [parsedSections];
    }

    if (parsedSections) {
      for (const section of parsedSections) {
        if (section.heading) {
          const headingSize = baseFontSize + 4;
          ensureSpace(headingSize + 16);
          yPos -= 12;
          page.drawText(sanitizeForPdf(String(section.heading)), { x: margin, y: yPos, size: headingSize, font: boldFont, color: rgb(0.1, 0.1, 0.3) });
          yPos -= headingSize + 8;
        }
        if (!section.body && !section.bullets) continue;
        if (section.body) {
          const paragraphs = sanitizeForPdf(String(section.body)).split("\n");
          for (const para of paragraphs) {
            if (!para.trim()) { yPos -= baseFontSize; continue; }
            const lines = wrapText(para, font, baseFontSize, maxWidth);
            for (const line of lines) {
              ensureSpace(baseFontSize + 4);
              page.drawText(line, { x: margin, y: yPos, size: baseFontSize, font, color: rgb(0.15, 0.15, 0.15) });
              yPos -= baseFontSize + 4;
            }
            yPos -= 4;
          }
        }
        if (section.bullets && Array.isArray(section.bullets)) {
          for (const bullet of section.bullets) {
            if (!bullet) continue;
            const bulletText = sanitizeForPdf(String(bullet));
            const lines = wrapText("* " + bulletText, font, baseFontSize, maxWidth - 10);
            for (const line of lines) {
              ensureSpace(baseFontSize + 4);
              page.drawText(line, { x: margin + 10, y: yPos, size: baseFontSize, font, color: rgb(0.15, 0.15, 0.15) });
              yPos -= baseFontSize + 4;
            }
            yPos -= 2;
          }
        }
      }
    }

    const form = doc.getForm();
    let fieldCount = 0;

    if (params.fields) {
      yPos -= 20;
      for (const f of params.fields) {
        const fieldY = f.y || yPos;
        const fieldX = f.x || margin;

        if (f.label) {
          const labelPage = doc.getPages()[doc.getPageCount() - 1];
          labelPage.drawText(sanitizeForPdf(f.label + ":"), { x: fieldX, y: fieldY + (f.height || 20) + 4, size: f.fontSize || 10, font, color: rgb(0.2, 0.2, 0.2) });
        }

        switch (f.type) {
          case "text": {
            const textField = form.createTextField(f.name);
            textField.addToPage(page, { x: fieldX, y: fieldY, width: f.width || 200, height: f.height || 24 });
            if (f.value) textField.setText(f.value);
            if (f.multiline) textField.enableMultiline();
            if (f.required) textField.enableRequired();
            fieldCount++;
            break;
          }
          case "checkbox": {
            const checkbox = form.createCheckBox(f.name);
            checkbox.addToPage(page, { x: fieldX, y: fieldY, width: f.width || 16, height: f.height || 16 });
            if (f.value === "true" || f.value === "checked") checkbox.check();
            fieldCount++;
            break;
          }
          case "dropdown": {
            const dropdown = form.createDropdown(f.name);
            dropdown.addToPage(page, { x: fieldX, y: fieldY, width: f.width || 200, height: f.height || 24 });
            if (f.options) dropdown.setOptions(f.options);
            if (f.value) dropdown.select(f.value);
            if (f.required) dropdown.enableRequired();
            fieldCount++;
            break;
          }
        }
        yPos -= (f.height || 24) + 30;
      }
    }

    const filename = params.outputPath || `pdf_${Date.now()}.pdf`;
    const outputPath = safePath(filename.startsWith("uploads/") ? filename : `uploads/${filename}`);
    const pdfBytes = await doc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    const baseName = path.basename(outputPath);
    const displayName = params.title ? `${params.title}.pdf` : baseName;
    await persistToDb(baseName, displayName, pdfBytes);

    const relativePath = path.relative(WORKSPACE_ROOT, outputPath);
    const pageCount = doc.getPageCount();

    const sectionsArr = Array.isArray(parsedSections) ? parsedSections : [];
    const contentLength = (params.content?.length || 0) + (sectionsArr.reduce((sum: number, s: any) => sum + (s?.heading?.length || 0) + (s?.body?.length || 0), 0) || 0);
    console.log(`[pdf] Created "${displayName}": ${pageCount} pages, ${pdfBytes.length} bytes, ${contentLength} chars of input content, ${fieldCount} fields`);

    const result: any = {
      success: true,
      path: relativePath,
      url: `/uploads/${baseName}`,
      filename: baseName,
      pages: pageCount,
      size: pdfBytes.length,
      contentCharsReceived: contentLength,
      fields: fieldCount,
    };

    try {
      const driveResult = await uploadAndShare({
        filePath: relativePath,
        fileName: displayName,
        mimeType: "application/pdf",
        description: params.title ? `${params.title} — ${pageCount} pages, generated by VisionClaw` : undefined,
        customerName: params.customerName,
        folderLabel: params.folderLabel || params.title,
      });
      if (driveResult.success) {
        result.googleDrive = {
          fileId: driveResult.fileId,
          shareableLink: driveResult.viewUrl,
          directDownloadLink: driveResult.downloadUrl,
          webViewLink: driveResult.viewUrl,
        };
        console.log(`[pdf] Auto-uploaded to Google Drive: ${driveResult.viewUrl}`);
      } else {
        console.warn(`[pdf] Google Drive auto-upload failed: ${driveResult.error}`);
        result.driveUploadError = driveResult.error;
      }
    } catch (driveErr: any) {
      console.warn(`[pdf] Google Drive auto-upload skipped: ${driveErr.message}`);
    }

    return result;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fillPdf(params: FillPdfParams): Promise<{ success: boolean; path?: string; url?: string; filledFields?: string[]; error?: string }> {
  try {
    ensureOutputDir();
    const inputPath = safePath(params.inputPath);
    if (!fs.existsSync(inputPath)) throw new Error(`File not found: ${params.inputPath}`);

    const pdfBytes = fs.readFileSync(inputPath);
    const doc = await PDFDocument.load(pdfBytes);
    const form = doc.getForm();
    const filledFields: string[] = [];

    for (const [name, value] of Object.entries(params.fields)) {
      try {
        const field = form.getField(name);
        if (!field) continue;

        if (field instanceof PDFTextField) {
          field.setText(String(value));
          filledFields.push(name);
        } else if (field instanceof PDFCheckBox) {
          if (value === true || value === "true" || value === "checked") {
            field.check();
          } else {
            field.uncheck();
          }
          filledFields.push(name);
        } else if (field instanceof PDFDropdown) {
          field.select(String(value));
          filledFields.push(name);
        }
      } catch (fieldErr: any) {
        console.error(`[pdf] Failed to fill field "${name}": ${fieldErr.message}`);
      }
    }

    if (params.flatten) {
      form.flatten();
    }

    const filename = params.outputPath || params.inputPath.replace(".pdf", "_filled.pdf");
    const outputPath = safePath(filename.startsWith("uploads/") ? filename : `uploads/${filename}`);
    const savedBytes = await doc.save();
    fs.writeFileSync(outputPath, savedBytes);
    const baseName = path.basename(outputPath);
    await persistToDb(baseName, baseName, savedBytes);

    const relativePath = path.relative(WORKSPACE_ROOT, outputPath);
    return {
      success: true,
      path: relativePath,
      url: `/uploads/${baseName}`,
      filledFields,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function editPdf(params: EditPdfParams): Promise<{ success: boolean; path?: string; url?: string; pages?: number; fieldsAdded?: number; error?: string }> {
  try {
    ensureOutputDir();
    const inputPath = safePath(params.inputPath);
    if (!fs.existsSync(inputPath)) throw new Error(`File not found: ${params.inputPath}`);

    const pdfBytes = fs.readFileSync(inputPath);
    const doc = await PDFDocument.load(pdfBytes);
    const font = await doc.embedFont(StandardFonts.Helvetica);

    if (params.removePages && params.removePages.length > 0) {
      const sorted = [...params.removePages].sort((a, b) => b - a);
      for (const pageNum of sorted) {
        const idx = pageNum - 1;
        if (idx >= 0 && idx < doc.getPageCount()) {
          doc.removePage(idx);
        }
      }
    }

    if (params.addPages) {
      for (let i = 0; i < params.addPages; i++) {
        doc.addPage();
      }
    }

    if (params.addText) {
      for (const t of params.addText) {
        const pageIdx = (t.page || 1) - 1;
        if (pageIdx < 0 || pageIdx >= doc.getPageCount()) continue;
        const pg = doc.getPages()[pageIdx];
        pg.drawText(sanitizeForPdf(t.text), {
          x: t.x,
          y: t.y,
          size: t.fontSize || 12,
          font,
          color: parseColor(t.color),
        });
      }
    }

    let fieldsAdded = 0;
    if (params.addFields) {
      const form = doc.getForm();
      for (const f of params.addFields) {
        const pageIdx = 0;
        const pg = doc.getPages()[pageIdx];

        switch (f.type) {
          case "text": {
            const textField = form.createTextField(f.name);
            textField.addToPage(pg, { x: f.x, y: f.y, width: f.width || 200, height: f.height || 24 });
            if (f.value) textField.setText(f.value);
            if (f.multiline) textField.enableMultiline();
            fieldsAdded++;
            break;
          }
          case "checkbox": {
            const checkbox = form.createCheckBox(f.name);
            checkbox.addToPage(pg, { x: f.x, y: f.y, width: f.width || 16, height: f.height || 16 });
            fieldsAdded++;
            break;
          }
          case "dropdown": {
            const dropdown = form.createDropdown(f.name);
            dropdown.addToPage(pg, { x: f.x, y: f.y, width: f.width || 200, height: f.height || 24 });
            if (f.options) dropdown.setOptions(f.options);
            fieldsAdded++;
            break;
          }
        }
      }
    }

    const filename = params.outputPath || params.inputPath.replace(".pdf", "_edited.pdf");
    const outputPath = safePath(filename.startsWith("uploads/") ? filename : `uploads/${filename}`);
    const savedBytes = await doc.save();
    fs.writeFileSync(outputPath, savedBytes);
    const baseName = path.basename(outputPath);
    await persistToDb(baseName, baseName, savedBytes);

    const relativePath = path.relative(WORKSPACE_ROOT, outputPath);
    return {
      success: true,
      path: relativePath,
      url: `/uploads/${path.basename(outputPath)}`,
      pages: doc.getPageCount(),
      fieldsAdded,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function listPdfFields(inputPath: string): Promise<{ success: boolean; fields?: { name: string; type: string; value?: string }[]; error?: string }> {
  try {
    const resolved = safePath(inputPath);
    if (!fs.existsSync(resolved)) throw new Error(`File not found: ${inputPath}`);

    const pdfBytes = fs.readFileSync(resolved);
    const doc = await PDFDocument.load(pdfBytes);
    const form = doc.getForm();
    const allFields = form.getFields();

    const fields = allFields.map((field) => {
      const name = field.getName();
      let type = "unknown";
      let value: string | undefined;

      if (field instanceof PDFTextField) {
        type = "text";
        value = field.getText() || undefined;
      } else if (field instanceof PDFCheckBox) {
        type = "checkbox";
        value = field.isChecked() ? "checked" : "unchecked";
      } else if (field instanceof PDFDropdown) {
        type = "dropdown";
        const selected = field.getSelected();
        value = selected.length > 0 ? selected[0] : undefined;
      }

      return { name, type, value };
    });

    return { success: true, fields };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
