const form = document.querySelector('#translateForm');
const fileInput = document.querySelector('#fileInput');
const fileName = document.querySelector('#fileName');
const pastedTextInput = document.querySelector('#pastedText');
const sourceLanguage = document.querySelector('#sourceLanguage');
const targetLanguage = document.querySelector('#targetLanguage');
const exportFormat = document.querySelector('#exportFormat');
const themeMode = document.querySelector('#themeMode');
const themeQuickToggle = document.querySelector('#themeQuickToggle');
const swapLanguagesButton = document.querySelector('#swapLanguages');
const pairSupport = document.querySelector('#pairSupport');
const statusBox = document.querySelector('#status');
const button = document.querySelector('#translateButton');
const progressPanel = document.querySelector('#progressPanel');
const progressLabel = document.querySelector('#progressLabel');
const progressPercent = document.querySelector('#progressPercent');
const progressFill = document.querySelector('#progressFill');
const downloadPanel = document.querySelector('#downloadPanel');
const downloadName = document.querySelector('#downloadName');
const saveButton = document.querySelector('#saveButton');
const previewPanel = document.querySelector('#previewPanel');
const previewMeta = document.querySelector('#previewMeta');
const previewText = document.querySelector('#previewText');

const TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.csv',
  '.tsv',
  '.json',
  '.xml',
  '.yaml',
  '.yml',
  '.html',
  '.htm',
  '.log'
]);

const COUNTRY_LANGUAGES = [
  { country: 'Austria', code: 'de', language: 'German' },
  { country: 'Bulgaria', code: 'bg', language: 'Bulgarian' },
  { country: 'Croatia', code: 'hr', language: 'Croatian' },
  { country: 'Czech Rep.', code: 'cs', language: 'Czech' },
  { country: 'United Kingdom', code: 'en', language: 'English' },
  { country: 'France', code: 'fr', language: 'French' },
  { country: 'Germany', code: 'de', language: 'German' },
  { country: 'Hungary', code: 'hu', language: 'Hungarian' },
  { country: 'Italy', code: 'it', language: 'Italian' },
  { country: 'Kazakhstan', code: 'kk', language: 'Kazakh' },
  { country: 'Moldova', code: 'ro', language: 'Romanian' },
  { country: 'Netherlands', code: 'nl', language: 'Dutch' },
  { country: 'Pakistan', code: 'ur', language: 'Urdu' },
  { country: 'Poland', code: 'pl', language: 'Polish' },
  { country: 'Portugal', code: 'pt', language: 'Portuguese' },
  { country: 'Romania', code: 'ro', language: 'Romanian' },
  { country: 'Serbia', code: 'sr', language: 'Serbian' },
  { country: 'Slovakia', code: 'sk', language: 'Slovak' },
  { country: 'Spain', code: 'es', language: 'Spanish' },
  { country: 'Turkey', code: 'tr', language: 'Turkish' },
  { country: 'Ukraine', code: 'uk', language: 'Ukrainian' },
  { country: 'Sweden', code: 'sv', language: 'Swedish' },
  { country: 'Finland', code: 'fi', language: 'Finnish' },
  { country: 'UAE', code: 'ar', language: 'Arabic' }
];

const LANGUAGE_NAMES = {
  ar: 'Arabic',
  bg: 'Bulgarian',
  cs: 'Czech',
  de: 'German',
  en: 'English',
  es: 'Spanish',
  fi: 'Finnish',
  fr: 'French',
  hr: 'Croatian',
  hu: 'Hungarian',
  it: 'Italian',
  kk: 'Kazakh',
  nl: 'Dutch',
  pl: 'Polish',
  pt: 'Portuguese',
  ro: 'Romanian',
  sk: 'Slovak',
  sr: 'Serbian',
  sv: 'Swedish',
  tr: 'Turkish',
  uk: 'Ukrainian',
  ur: 'Urdu'
};

const THEME_STORAGE_KEY = 'translator.theme';

let translatedBlob = null;
let translatedFileName = 'translated.txt';
let translatedObjectUrl = null;
let isSubmitting = false;
let latestPairCheckToken = 0;
const availabilityCache = new Map();
const TRANSLATOR_CREATE_TIMEOUT_MS = 90_000;
let activeProgress = {
  extractionBase: 65,
  extractionShare: 15,
  translationBase: 82,
  translationShare: 16
};

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

function getStoredThemeMode() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'system';
  } catch {
    return 'system';
  }
}

function getSystemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getEffectiveTheme(mode) {
  const selected = mode === 'light' || mode === 'dark' ? mode : 'system';
  return selected === 'system' ? getSystemTheme() : selected;
}

function updateThemeQuickToggle(mode) {
  if (!themeQuickToggle) return;

  const effective = getEffectiveTheme(mode);
  const nextTheme = effective === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${nextTheme} theme`;

  themeQuickToggle.dataset.nextTheme = nextTheme;
  themeQuickToggle.setAttribute('aria-label', label);
  themeQuickToggle.title = label;
}

function applyTheme(mode) {
  const selected = mode === 'light' || mode === 'dark' ? mode : 'system';
  const effective = getEffectiveTheme(selected);
  document.documentElement.dataset.theme = effective;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, selected);
  } catch {
    // Ignore storage errors in restricted contexts.
  }

  if (themeMode) {
    themeMode.value = selected;
  }

  updateThemeQuickToggle(selected);
}

const preferredTheme = getStoredThemeMode();
applyTheme(preferredTheme);

if (themeMode) {
  themeMode.addEventListener('change', () => {
    applyTheme(themeMode.value);
  });
}

if (themeQuickToggle) {
  themeQuickToggle.addEventListener('click', () => {
    const nextTheme = themeQuickToggle.dataset.nextTheme || (getSystemTheme() === 'dark' ? 'light' : 'dark');
    applyTheme(nextTheme);
  });
}

if (window.matchMedia) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', () => {
    if (getStoredThemeMode() === 'system') {
      applyTheme('system');
    }
  });
}

function populateLanguageSelects() {
  const options = COUNTRY_LANGUAGES.map((item) => {
    const option = document.createElement('option');
    option.value = item.code;
    option.textContent = `${item.country} - ${item.language}`;
    return option;
  });

  sourceLanguage.replaceChildren(...options.map((option) => option.cloneNode(true)));
  targetLanguage.replaceChildren(...options.map((option) => option.cloneNode(true)));
  sourceLanguage.value = 'uk';
  targetLanguage.value = 'en';
}

populateLanguageSelects();

function setStatus(message, type = '') {
  statusBox.textContent = message;
  statusBox.className = `status ${type}`.trim();
}

function setPairSupport(message, type = '') {
  pairSupport.textContent = message;
  pairSupport.className = `pair-support ${type}`.trim();
}

function setProgress(value, label = '') {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  progressPanel.hidden = false;
  progressLabel.textContent = label || progressLabel.textContent || 'Working';
  progressPercent.textContent = `${percent}%`;
  progressFill.style.width = `${percent}%`;
  progressFill.parentElement.setAttribute('aria-valuenow', String(percent));
}

function hideProgress() {
  progressPanel.hidden = true;
  progressLabel.textContent = 'Preparing';
  progressPercent.textContent = '0%';
  progressFill.style.width = '0%';
  progressFill.parentElement.setAttribute('aria-valuenow', '0');
}

function clearDownload() {
  translatedBlob = null;
  translatedFileName = 'translated.txt';
  if (translatedObjectUrl) {
    URL.revokeObjectURL(translatedObjectUrl);
    translatedObjectUrl = null;
  }
  downloadPanel.hidden = true;
  downloadName.textContent = '';
  previewPanel.hidden = true;
  previewMeta.textContent = '';
  previewText.textContent = '';
  hideProgress();
}

function formatBytes(size) {
  if (size < 1024) return `${size} bytes`;
  return `${Math.round(size / 1024)} KB`;
}

function getExtension(file) {
  const match = file.name.toLowerCase().match(/\.[^.]+$/);
  return match ? match[0] : '';
}

function sanitizeFilename(name) {
  return String(name || 'document')
    .replace(/[^\w.\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 120) || 'document';
}

function normalizeText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function normalizeDocxError(error) {
  const message = String(error?.message || '');
  if (/central directory|zip file|end of central directory/i.test(message)) {
    const friendly = new Error('The selected file is not a valid DOCX package. Re-save it as .docx in Word or Google Docs, then try again.');
    friendly.code = 'invalid-docx-zip';
    return friendly;
  }

  if (error instanceof Error) return error;
  return new Error('DOCX processing failed. Try another file.');
}

function textItemX(item) {
  return item.transform?.[4] || 0;
}

function textItemY(item) {
  return item.transform?.[5] || 0;
}

function textItemWidth(item) {
  return item.width || item.str?.length || 1;
}

function textItemHeight(item) {
  const matrixHeight = Math.abs(item.transform?.[3] || 0);
  return matrixHeight || item.height || 10;
}

function getMedian(values) {
  if (!values.length) return 1;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] || 1;
}

function estimateCharacterWidth(items) {
  const widths = items
    .filter((item) => item.str && item.str.trim().length > 1 && textItemWidth(item) > 0)
    .map((item) => textItemWidth(item) / item.str.length)
    .filter((width) => Number.isFinite(width) && width > 0);

  return Math.max(getMedian(widths), 3);
}

function groupPdfItemsIntoLineObjects(items) {
  const charWidth = estimateCharacterWidth(items);
  const yTolerance = Math.max(2, getMedian(items.map(textItemHeight)) * 0.35);
  const minX = Math.min(...items.map(textItemX).filter(Number.isFinite), 0);
  const sorted = [...items].sort((a, b) => {
    const yDiff = textItemY(b) - textItemY(a);
    if (Math.abs(yDiff) > yTolerance) return yDiff;
    return textItemX(a) - textItemX(b);
  });

  const lines = [];
  for (const item of sorted) {
    const text = item.str?.trim();
    if (!text) continue;

    const y = textItemY(item);
    let line = lines.find((candidate) => Math.abs(candidate.y - y) <= yTolerance);
    if (!line) {
      line = { y, items: [] };
      lines.push(line);
    }
    line.items.push(item);
  }

  return lines
    .map((line) => {
      let text = '';
      let cursor = 0;
      const orderedItems = line.items.sort((a, b) => textItemX(a) - textItemX(b));
      let xStart = Number.POSITIVE_INFINITY;
      let xEnd = 0;

      for (const item of orderedItems) {
        const chunk = item.str?.replace(/\s+/g, ' ').trim();
        if (!chunk) continue;

        const x = textItemX(item);
        const width = textItemWidth(item);
        xStart = Math.min(xStart, x);
        xEnd = Math.max(xEnd, x + width);

        const column = Math.max(0, Math.round((x - minX) / charWidth));
        const spaces = Math.max(column - cursor, text ? 1 : 0);
        text += ' '.repeat(spaces) + chunk;
        cursor = column + chunk.length;
      }

      return {
        y: line.y,
        xStart: Number.isFinite(xStart) ? xStart : 0,
        xEnd,
        text: text.trimEnd()
      };
    })
    .filter((line) => line.text);
}

function detectPdfColumnSplit(lines) {
  if (lines.length < 12) return null;

  const xs = lines.map((line) => line.xStart).filter(Number.isFinite);
  if (xs.length < 12) return null;

  let c1 = Math.min(...xs);
  let c2 = Math.max(...xs);
  if (Math.abs(c2 - c1) < 120) return null;

  let left = [];
  let right = [];
  for (let round = 0; round < 8; round += 1) {
    left = [];
    right = [];
    for (const x of xs) {
      if (Math.abs(x - c1) <= Math.abs(x - c2)) left.push(x);
      else right.push(x);
    }
    if (!left.length || !right.length) return null;
    c1 = left.reduce((sum, value) => sum + value, 0) / left.length;
    c2 = right.reduce((sum, value) => sum + value, 0) / right.length;
  }

  const separation = Math.abs(c2 - c1);
  const balance = Math.min(left.length, right.length) / xs.length;
  if (separation < 120 || balance < 0.22) return null;

  return (c1 + c2) / 2;
}

function splitPdfLineIntoTableCells(lineText) {
  const cells = lineText
    .split(/\s{3,}/)
    .map((cell) => cell.trim())
    .filter(Boolean);
  return cells.length >= 2 ? cells : null;
}

function combinePdfParagraphLines(lines) {
  let combined = '';
  for (const line of lines) {
    const value = line.trim();
    if (!value) continue;
    if (!combined) {
      combined = value;
      continue;
    }

    if (combined.endsWith('-') && /^[\p{L}\p{N}]/u.test(value)) {
      combined = `${combined.slice(0, -1)}${value}`;
    } else {
      combined = `${combined} ${value}`;
    }
  }
  return combined.trim();
}

function buildPdfSegmentsFromOrderedLines(lines) {
  if (!lines.length) return [];

  const yGaps = [];
  for (let index = 1; index < lines.length; index += 1) {
    const gap = lines[index - 1].y - lines[index].y;
    if (gap > 0 && gap < 120) yGaps.push(gap);
  }
  const baseGap = Math.max(4, getMedian(yGaps));
  const paragraphBreakGap = baseGap * 1.7;

  const segments = [];
  let index = 0;
  while (index < lines.length) {
    const firstCells = splitPdfLineIntoTableCells(lines[index].text);
    if (firstCells) {
      const rows = [firstCells];
      let cursor = index + 1;
      while (cursor < lines.length) {
        const nextCells = splitPdfLineIntoTableCells(lines[cursor].text);
        if (!nextCells) break;
        rows.push(nextCells);
        cursor += 1;
      }

      if (rows.length >= 2) {
        segments.push({ type: 'table', rows });
        index = cursor;
        continue;
      }
    }

    const paragraphLines = [lines[index].text];
    let cursor = index + 1;
    while (cursor < lines.length) {
      const gap = lines[cursor - 1].y - lines[cursor].y;
      if (splitPdfLineIntoTableCells(lines[cursor].text)) break;
      if (gap > paragraphBreakGap) break;
      paragraphLines.push(lines[cursor].text);
      cursor += 1;
    }

    const paragraph = combinePdfParagraphLines(paragraphLines);
    if (paragraph) segments.push({ type: 'paragraph', text: paragraph });
    index = cursor;
  }

  return segments;
}

function buildPdfPageStructure(lines) {
  const splitX = detectPdfColumnSplit(lines);
  if (!splitX) {
    const ordered = [...lines].sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 1) return yDiff;
      return a.xStart - b.xStart;
    });
    return {
      columns: [buildPdfSegmentsFromOrderedLines(ordered)]
    };
  }

  const leftLines = lines.filter((line) => line.xStart <= splitX).sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > 1) return yDiff;
    return a.xStart - b.xStart;
  });
  const rightLines = lines.filter((line) => line.xStart > splitX).sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > 1) return yDiff;
    return a.xStart - b.xStart;
  });

  const columns = [];
  if (leftLines.length) columns.push(buildPdfSegmentsFromOrderedLines(leftLines));
  if (rightLines.length) columns.push(buildPdfSegmentsFromOrderedLines(rightLines));

  return { columns: columns.length ? columns : [buildPdfSegmentsFromOrderedLines(lines)] };
}

function renderPdfStructureAsText(structure) {
  const output = [];
  for (let pageIndex = 0; pageIndex < structure.pages.length; pageIndex += 1) {
    const page = structure.pages[pageIndex];
    if (pageIndex > 0) {
      output.push('');
      output.push('--- Page Break ---');
      output.push('');
    }

    for (let columnIndex = 0; columnIndex < page.columns.length; columnIndex += 1) {
      const segments = page.columns[columnIndex];
      if (columnIndex > 0) output.push('');

      for (const segment of segments) {
        if (segment.type === 'table') {
          for (const row of segment.rows) {
            output.push(row.join(' | '));
          }
          output.push('');
        } else if (segment.type === 'paragraph') {
          output.push(segment.text);
          output.push('');
        }
      }
    }
  }

  return normalizeText(output.join('\n'));
}

function renderPdfStructureAsHtml(structure) {
  const pagesMarkup = structure.pages.map((page, pageIndex) => {
    const columnsMarkup = page.columns.map((segments) => {
      const segmentsMarkup = segments.map((segment) => {
        if (segment.type === 'table') {
          const rows = segment.rows
            .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
            .join('');
          return `<table><tbody>${rows}</tbody></table>`;
        }

        return `<p>${escapeHtml(segment.text)}</p>`;
      }).join('');

      return `<div class="pdf-col">${segmentsMarkup}</div>`;
    }).join('');

    return `<section class="pdf-page" data-page="${pageIndex + 1}">${columnsMarkup}</section>`;
  }).join('');

  return `<div class="pdf-structure">${pagesMarkup}</div>`;
}

function countPdfStructureChunks(structure) {
  let total = 0;
  for (const page of structure.pages) {
    for (const segments of page.columns) {
      for (const segment of segments) {
        if (segment.type === 'paragraph') {
          total += splitLongSegment(segment.text).length;
        } else if (segment.type === 'table') {
          for (const row of segment.rows) {
            for (const cell of row) {
              if (cell.trim()) total += splitLongSegment(cell).length;
            }
          }
        }
      }
    }
  }
  return Math.max(total, 1);
}

async function translatePdfStructure(structure, source, target, translator) {
  if (source === target) return structure;

  const state = {
    translatedCount: 0,
    totalChunks: countPdfStructureChunks(structure)
  };

  for (const page of structure.pages) {
    for (const segments of page.columns) {
      for (const segment of segments) {
        if (segment.type === 'paragraph') {
          segment.text = await translateChunkedText(segment.text, translator, state);
        } else if (segment.type === 'table') {
          for (let rowIndex = 0; rowIndex < segment.rows.length; rowIndex += 1) {
            for (let cellIndex = 0; cellIndex < segment.rows[rowIndex].length; cellIndex += 1) {
              const cell = segment.rows[rowIndex][cellIndex];
              if (!cell.trim()) continue;
              segment.rows[rowIndex][cellIndex] = await translateChunkedText(cell, translator, state);
            }
          }
        }
      }
    }
  }

  return structure;
}

async function extractPdfStructure(file) {
  if (!window.pdfjsLib) {
    throw new Error('PDF support did not load. Check your connection and reload the page.');
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await window.pdfjsLib.getDocument({ data }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const extractProgress = activeProgress.extractionBase + ((pageNumber - 1) / pdf.numPages) * activeProgress.extractionShare;
    setProgress(extractProgress, `Extracting PDF page ${pageNumber} of ${pdf.numPages}`);
    setStatus(`Extracting PDF text: page ${pageNumber} of ${pdf.numPages}.`);
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lineObjects = groupPdfItemsIntoLineObjects(content.items);
    pages.push(buildPdfPageStructure(lineObjects));
  }

  return { pages };
}

function groupPdfItemsIntoLines(items) {
  const charWidth = estimateCharacterWidth(items);
  const minX = Math.min(...items.map(textItemX).filter(Number.isFinite), 0);
  const sorted = [...items].sort((a, b) => {
    const yDiff = textItemY(b) - textItemY(a);
    if (Math.abs(yDiff) > 2) return yDiff;
    return textItemX(a) - textItemX(b);
  });
  const lines = [];

  for (const item of sorted) {
    const text = item.str?.trim();
    if (!text) continue;

    const y = textItemY(item);
    let line = lines.find((candidate) => Math.abs(candidate.y - y) <= 2);
    if (!line) {
      line = { y, items: [] };
      lines.push(line);
    }
    line.items.push(item);
  }

  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) => {
      let output = '';
      let cursor = 0;
      for (const item of line.items.sort((a, b) => textItemX(a) - textItemX(b))) {
        const text = item.str?.replace(/\s+/g, ' ').trim();
        if (!text) continue;

        const column = Math.max(0, Math.round((textItemX(item) - minX) / charWidth));
        const spaces = Math.max(column - cursor, output ? 1 : 0);
        output += ' '.repeat(spaces) + text;
        cursor = column + text.length;
      }
      return output.trimEnd();
    })
    .filter(Boolean);
}

async function extractPdf(file) {
  const structure = await extractPdfStructure(file);
  return renderPdfStructureAsText(structure);
}

async function extractDocx(file) {
  if (!window.mammoth) {
    throw new Error('DOCX support did not load. Check your connection and reload the page.');
  }

  try {
    setProgress(activeProgress.extractionBase + activeProgress.extractionShare * 0.5, 'Extracting DOCX text');
    const result = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return normalizeText(result.value || '');
  } catch (error) {
    throw normalizeDocxError(error);
  }
}

async function extractDocxHtml(file) {
  if (!window.mammoth) {
    throw new Error('DOCX support did not load. Check your connection and reload the page.');
  }

  try {
    setProgress(activeProgress.extractionBase + activeProgress.extractionShare * 0.5, 'Extracting DOCX structure');
    const result = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    return result.value || '';
  } catch (error) {
    throw normalizeDocxError(error);
  }
}

async function extractTextFile(file) {
  setProgress(activeProgress.extractionBase + activeProgress.extractionShare * 0.5, 'Reading text file');
  let text = await file.text();
  const extension = getExtension(file);

  if (extension === '.html' || extension === '.htm') {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    text = doc.body?.innerText || text;
  } else if (extension === '.json') {
    try {
      text = JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      // Keep the original text if the file extension is JSON but the content is not valid JSON.
    }
  }

  return normalizeText(text);
}

async function extractText(file) {
  const extension = getExtension(file);
  if (extension === '.pdf') return extractPdf(file);
  if (extension === '.docx') return extractDocx(file);
  if (TEXT_EXTENSIONS.has(extension)) return extractTextFile(file);

  throw new Error('This static version supports PDF, DOCX, and text-like files. Old DOC, RTF, and ODT need a server-side converter.');
}

function splitLongSegment(text, maxLength = 900) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]?\s*/g) || [text];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength && current) {
      chunks.push(current.trim());
      current = '';
    }
    if (sentence.length > maxLength) {
      for (let index = 0; index < sentence.length; index += maxLength) {
        chunks.push(sentence.slice(index, index + maxLength).trim());
      }
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapTranslatedBlock(text, firstPrefix = '', continuationPrefix = firstPrefix, width = 110) {
  const clean = text.trim();
  if (!clean || clean.length + firstPrefix.length <= width) return `${firstPrefix}${clean}`;

  const words = clean.split(/\s+/);
  const lines = [];
  let current = firstPrefix;

  for (const word of words) {
    const next = current.trim() ? `${current} ${word}` : `${firstPrefix}${word}`;
    if (next.length > width && current.trim()) {
      lines.push(current);
      current = `${continuationPrefix}${word}`;
    } else {
      current = next;
    }
  }

  if (current.trim()) lines.push(current);
  return lines.join('\n');
}

function parseListPrefix(line) {
  const match = line.match(/^(\s*(?:(?:\d+(?:\.\d+)*\.?)|(?:[A-Za-zА-Яа-яІіЇїЄєҐґ]\))|[-*•])\s+)(.*)$/);
  if (!match) return null;

  return {
    prefix: match[1],
    text: match[2]
  };
}

function isPageMarker(line) {
  return /^--- Page Break ---$/.test(line.trim());
}

function createTranslationUnits(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const units = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      units.push({ type: 'raw', value: '' });
      index += 1;
      continue;
    }

    if (isPageMarker(line)) {
      units.push({ type: 'raw', value: line });
      index += 1;
      continue;
    }

    const listStart = parseListPrefix(line);
    const collected = [line];
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index];
      const nextTrimmed = nextLine.trim();
      if (!nextTrimmed || isPageMarker(nextLine)) break;
      if (parseListPrefix(nextLine)) break;

      collected.push(nextLine);
      index += 1;
    }

    const leadingSpace = line.match(/^[ \t]*/)[0];
    const prefix = listStart ? listStart.prefix : leadingSpace;
    const firstText = listStart ? listStart.text : line.trim();
    const continuationText = collected.slice(1).map((item) => item.trim()).filter(Boolean);
    const sourceText = [firstText.trim(), ...continuationText].filter(Boolean).join(' ');

    units.push({
      type: 'translate',
      prefix,
      continuationPrefix: ' '.repeat(prefix.length),
      text: sourceText
    });
  }

  return units;
}

function getHtmlTextNodes(doc) {
  const nodes = [];
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parentTag = node.parentElement?.tagName?.toLowerCase();
    if (parentTag === 'script' || parentTag === 'style' || parentTag === 'noscript') continue;
    if (!node.nodeValue || !node.nodeValue.trim()) continue;
    nodes.push(node);
  }

  return nodes;
}

async function translateChunkedText(text, translator, state) {
  const chunks = splitLongSegment(text);
  const translatedChunks = [];

  for (const chunk of chunks) {
    state.translatedCount += 1;
    const progress = activeProgress.translationBase + (state.translatedCount / state.totalChunks) * activeProgress.translationShare;
    setProgress(progress, `Translating block ${state.translatedCount} of ${state.totalChunks}`);
    setStatus(`Translating locally in Chrome: block ${state.translatedCount}.`);
    translatedChunks.push(await translator.translate(chunk));
  }

  return translatedChunks.join(' ');
}

async function translateHtmlPreservingStructure(htmlFragment, source, target, translator) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<!doctype html><html><body>${htmlFragment}</body></html>`, 'text/html');

  if (source === target) {
    return doc.body.innerHTML;
  }

  const textNodes = getHtmlTextNodes(doc);
  if (!textNodes.length) {
    throw new Error('No readable DOCX text nodes were found for HTML export.');
  }

  const totalChunks = textNodes.reduce((total, node) => total + splitLongSegment(node.nodeValue.trim()).length, 0);
  const state = { translatedCount: 0, totalChunks: Math.max(totalChunks, 1) };

  for (const node of textNodes) {
    const original = node.nodeValue;
    const leading = original.match(/^\s*/)?.[0] || '';
    const trailing = original.match(/\s*$/)?.[0] || '';
    const core = original.trim();
    if (!core) continue;

    const translatedCore = await translateChunkedText(core, translator, state);
    node.nodeValue = `${leading}${translatedCore}${trailing}`;
  }

  return doc.body.innerHTML;
}

function getTranslatorApi() {
  return window.Translator || null;
}

function createTimeoutError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function getPairAvailability(source, target) {
  if (source === target) return 'same';

  const cacheKey = `${source}:${target}`;
  if (availabilityCache.has(cacheKey)) {
    return availabilityCache.get(cacheKey);
  }

  const TranslatorApi = getTranslatorApi();
  if (!TranslatorApi) {
    return 'no-api';
  }

  try {
    const availability = await Promise.race([
      TranslatorApi.availability({
        sourceLanguage: source,
        targetLanguage: target
      }),
      new Promise((resolve) => setTimeout(() => resolve('unknown'), 3500))
    ]);
    availabilityCache.set(cacheKey, availability);
    return availability;
  } catch {
    return 'unknown';
  }
}

async function refreshPairSupportState() {
  const source = sourceLanguage.value;
  const target = targetLanguage.value;
  const sourceName = LANGUAGE_NAMES[source] || source;
  const targetName = LANGUAGE_NAMES[target] || target;
  const token = ++latestPairCheckToken;

  if (source === target) {
    setPairSupport('Selected pair is always available. The app will preserve text and generate a TXT output.', 'supported');
    if (!isSubmitting) button.disabled = false;
    return;
  }

  setPairSupport(`Checking support for ${sourceName} to ${targetName}...`, 'checking');
  if (!isSubmitting) button.disabled = true;
  const availability = await getPairAvailability(source, target);

  if (token !== latestPairCheckToken) return;

  if (availability === 'available' || availability === 'downloadable' || availability === 'downloading') {
    setPairSupport(`${sourceName} to ${targetName} is supported in Chrome local mode.`, 'supported');
    if (!isSubmitting) button.disabled = false;
    return;
  }

  if (availability === 'unavailable') {
    setPairSupport(`${sourceName} to ${targetName} is not available in Chrome local mode yet. Choose another pair or use a cloud translator.`, 'unsupported');
    hideProgress();
    if (!isSubmitting) button.disabled = true;
    return;
  }

  if (availability === 'no-api') {
    setPairSupport('Chrome local Translator API is not available in this browser. Use Chrome 138+ on desktop.', 'unsupported');
    hideProgress();
    if (!isSubmitting) button.disabled = true;
    return;
  }

  setPairSupport(`Could not verify ${sourceName} to ${targetName} support right now. You can still try translating.`, 'checking');
  if (!isSubmitting) button.disabled = false;
}

async function createChromeTranslator(source, target) {
  const TranslatorApi = getTranslatorApi();
  if (!TranslatorApi) {
    throw new Error('Chrome local Translator API is not available in this browser. Use Chrome 138 or newer on desktop.');
  }

  const availability = await TranslatorApi.availability({
    sourceLanguage: source,
    targetLanguage: target
  });

  if (availability === 'unavailable') {
    throw new Error(`Chrome local translation is not available for ${LANGUAGE_NAMES[source] || source} to ${LANGUAGE_NAMES[target] || target}.`);
  }

  setProgress(35, 'Preparing language model');

  const translatorPromise = TranslatorApi.create({
    sourceLanguage: source,
    targetLanguage: target,
    monitor(monitorTarget) {
      monitorTarget.addEventListener('downloadprogress', (event) => {
        if (Number.isFinite(event.loaded)) {
          setStatus(`Downloading Chrome language pack: ${Math.round(event.loaded * 100)}%.`);
          setProgress(35 + event.loaded * 30, 'Downloading language pack');
        } else {
          setStatus('Downloading Chrome language pack.');
          setProgress(45, 'Downloading language pack');
        }
      });
    }
  });

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(createTimeoutError(
        'Chrome translator setup is taking too long and was canceled. Try Incognito mode with extensions disabled, then retry.',
        'translator-create-timeout'
      ));
    }, TRANSLATOR_CREATE_TIMEOUT_MS);
  });

  return Promise.race([translatorPromise, timeoutPromise]);
}

async function translateLocally(text, source, target, translator) {
  if (source === target) {
    setProgress(95, 'Preparing translated file');
    return text;
  }

  const units = createTranslationUnits(text);
  const translatableUnits = units.filter((unit) => unit.type === 'translate' && unit.text.trim());
  if (!translatableUnits.length) throw new Error('No readable text was found in the provided input.');
  const totalChunks = translatableUnits.reduce((total, unit) => total + splitLongSegment(unit.text).length, 0);

  let translatedCount = 0;

  for (const unit of translatableUnits) {
    const chunks = splitLongSegment(unit.text);
    const translatedChunks = [];

    for (const chunk of chunks) {
      translatedCount += 1;
      const progress = activeProgress.translationBase + (translatedCount / totalChunks) * activeProgress.translationShare;
      setProgress(progress, `Translating block ${translatedCount} of ${totalChunks}`);
      setStatus(`Translating locally in Chrome: block ${translatedCount}.`);
      translatedChunks.push(await translator.translate(chunk));
    }

    unit.value = wrapTranslatedBlock(translatedChunks.join(' '), unit.prefix, unit.continuationPrefix);
  }

  return units.map((unit) => unit.type === 'raw' ? unit.value : unit.value).join('\n');
}

function buildResultText(originalName, source, target, translatedText) {
  return [
    `Source language: ${LANGUAGE_NAMES[source] || source}`,
    `Target language: ${LANGUAGE_NAMES[target] || target}`,
    `Original file: ${originalName}`,
    `Translation engine: Chrome local Translator API`,
    `Output format: layout-preserving plain text`,
    '',
    translatedText
  ].join('\n');
}

function buildResultHtml(originalName, source, target, content, mode = 'structured') {
  const sourceName = LANGUAGE_NAMES[source] || source;
  const targetName = LANGUAGE_NAMES[target] || target;
  const translatedMarkup = mode === 'structured'
    ? content
    : `<pre>${escapeHtml(content)}</pre>`;

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>Translated - ${escapeHtml(originalName)}</title>`,
    '  <style>',
    '    body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; margin: 24px; line-height: 1.5; color: #1a2430; }',
    '    .meta { border: 1px solid #d7dee6; border-radius: 8px; padding: 12px 14px; margin-bottom: 18px; background: #f8fbfd; }',
    '    .meta p { margin: 4px 0; }',
    '    pre { white-space: pre-wrap; word-break: break-word; background: #f8fbfd; border: 1px solid #d7dee6; border-radius: 8px; padding: 14px; }',
    '    .pdf-page { margin-bottom: 20px; }',
    '    .pdf-col { margin-bottom: 16px; }',
    '    .pdf-col p { margin: 0 0 12px; }',
    '    table { border-collapse: collapse; width: 100%; margin: 0 0 12px; }',
    '    td { border: 1px solid #d7dee6; padding: 6px 8px; vertical-align: top; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <section class="meta">',
    `    <p><strong>Source language:</strong> ${escapeHtml(sourceName)}</p>`,
    `    <p><strong>Target language:</strong> ${escapeHtml(targetName)}</p>`,
    `    <p><strong>Original file:</strong> ${escapeHtml(originalName)}</p>`,
    '    <p><strong>Translation engine:</strong> Chrome local Translator API</p>',
    `    <p><strong>Output format:</strong> ${mode === 'structured' ? 'HTML structure-preserving' : 'HTML wrapped text'}</p>`,
    '  </section>',
    '  <main>',
    translatedMarkup,
    '  </main>',
    '</body>',
    '</html>'
  ].join('\n');
}

function getTextFromHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return normalizeText(doc.body?.innerText || '');
}

function getPreviewRows(text) {
  return text
    .split('\n')
    .map((row) => row.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function showDownload(name, text, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mimeType });
  translatedBlob = blob;
  translatedFileName = name;
  translatedObjectUrl = URL.createObjectURL(blob);
  downloadName.textContent = `${translatedFileName} is ready (${formatBytes(blob.size)}).`;
  downloadPanel.hidden = false;
}

function fallbackDownload() {
  if (!translatedObjectUrl) return;

  const link = document.createElement('a');
  link.href = translatedObjectUrl;
  link.download = translatedFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function showPreview(translatedText, size) {
  const rows = getPreviewRows(translatedText);
  previewMeta.textContent = `${formatBytes(size)} created in browser`;
  previewText.textContent = rows.length ? rows.join('\n') : 'No translated rows found in the response.';
  previewPanel.hidden = false;
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  fileName.textContent = file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : 'PDF, DOCX, and text-like files up to 15 MB';
  clearDownload();
  setStatus('');
});

pastedTextInput.addEventListener('input', () => {
  clearDownload();
  setStatus('');
});

if (exportFormat) {
  exportFormat.addEventListener('change', () => {
    clearDownload();
    setStatus('');
  });
}

sourceLanguage.addEventListener('change', () => {
  clearDownload();
  setStatus('');
  refreshPairSupportState();
});

targetLanguage.addEventListener('change', () => {
  clearDownload();
  setStatus('');
  refreshPairSupportState();
});

swapLanguagesButton.addEventListener('click', () => {
  if (isSubmitting) return;

  const previousSource = sourceLanguage.value;
  sourceLanguage.value = targetLanguage.value;
  targetLanguage.value = previousSource;
  clearDownload();
  setStatus('Translation direction updated.');
  refreshPairSupportState();
});

refreshPairSupportState();

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const selectedFile = fileInput.files[0];
  const pastedText = normalizeText(pastedTextInput.value || '');
  if (!selectedFile && !pastedText) {
    setStatus('Choose a file or paste text first.', 'error');
    return;
  }

  const source = sourceLanguage.value;
  const target = targetLanguage.value;
  const selectedExportFormat = exportFormat?.value === 'html' ? 'html' : 'txt';
  const sourceName = LANGUAGE_NAMES[source] || source;
  const targetName = LANGUAGE_NAMES[target] || target;

  isSubmitting = true;
  button.disabled = true;
  clearDownload();
  let translator = null;

  try {
    const availability = await getPairAvailability(source, target);
    if (availability === 'unavailable') {
      throw new Error(`${sourceName} to ${targetName} is not available in Chrome local mode yet. Choose another pair or use a cloud translator.`);
    }

    if (availability === 'no-api') {
      throw new Error('Chrome local Translator API is not available in this browser. Use Chrome 138 or newer on desktop.');
    }

    if (source !== target) {
      setStatus('Preparing Chrome local translator.');
      translator = await createChromeTranslator(source, target);
    }

    let extractedText = '';
    let originalName = 'pasted-text.txt';
    let outputMime = 'text/plain;charset=utf-8';
    let outputExtension = 'txt';
    let resultContent = '';
    let previewSourceText = '';

    const selectedExtension = selectedFile ? getExtension(selectedFile) : '';
    const useStructuredDocxHtml = selectedExportFormat === 'html' && !pastedText && selectedExtension === '.docx';
    const useStructuredPdfHtml = selectedExportFormat === 'html' && !pastedText && selectedExtension === '.pdf';

    if (useStructuredDocxHtml) {
      originalName = selectedFile.name;
      try {
        setStatus('Extracting DOCX structure in the browser.');
        const docxHtml = await extractDocxHtml(selectedFile);

        if (!getTextFromHtml(docxHtml)) {
          throw new Error('No readable text was found in the DOCX file.');
        }

        const translatedHtml = await translateHtmlPreservingStructure(docxHtml, source, target, translator);
        resultContent = buildResultHtml(originalName, source, target, translatedHtml, 'structured');
        previewSourceText = getTextFromHtml(translatedHtml);
        outputMime = 'text/html;charset=utf-8';
        outputExtension = 'html';
      } catch (error) {
        const docxError = normalizeDocxError(error);
        if (docxError.code === 'invalid-docx-zip') {
          throw docxError;
        }

        setStatus('Structured DOCX export failed for this file. Falling back to plain HTML export.');
        const fallbackText = await extractDocx(selectedFile);
        if (!fallbackText.trim()) {
          throw new Error('No readable text was found in the DOCX file.');
        }

        const translatedText = await translateLocally(fallbackText, source, target, translator);
        resultContent = buildResultHtml(originalName, source, target, translatedText, 'pre');
        previewSourceText = translatedText;
        outputMime = 'text/html;charset=utf-8';
        outputExtension = 'html';
      }
    } else if (useStructuredPdfHtml) {
      setStatus('Extracting PDF structure in the browser.');
      originalName = selectedFile.name;
      const pdfStructure = await extractPdfStructure(selectedFile);
      const extractedPdfText = renderPdfStructureAsText(pdfStructure);

      if (!extractedPdfText.trim()) {
        throw new Error('No readable text was found in the PDF file.');
      }

      await translatePdfStructure(pdfStructure, source, target, translator);
      const translatedPdfHtml = renderPdfStructureAsHtml(pdfStructure);
      resultContent = buildResultHtml(originalName, source, target, translatedPdfHtml, 'structured');
      previewSourceText = getTextFromHtml(translatedPdfHtml);
      outputMime = 'text/html;charset=utf-8';
      outputExtension = 'html';
    } else {
      if (pastedText) {
        setStatus('Preparing pasted text.');
        setProgress(activeProgress.extractionBase, 'Preparing pasted text');
        extractedText = pastedText;
      } else {
        setStatus('Extracting text in the browser.');
        setProgress(activeProgress.extractionBase, 'Extracting text');
        extractedText = await extractText(selectedFile);
        originalName = selectedFile.name;
      }

      if (!extractedText.trim()) {
        throw new Error('No readable text was found. Scanned image PDFs are not supported yet.');
      }

      const translatedText = await translateLocally(extractedText, source, target, translator);
      previewSourceText = translatedText;

      if (selectedExportFormat === 'html') {
        resultContent = buildResultHtml(originalName, source, target, translatedText, 'pre');
        outputMime = 'text/html;charset=utf-8';
        outputExtension = 'html';
      } else {
        resultContent = buildResultText(originalName, source, target, translatedText);
        outputMime = 'text/plain;charset=utf-8';
        outputExtension = 'txt';
      }
    }

    const baseName = pastedText ? 'pasted-text' : (selectedFile.name.replace(/\.[^.]+$/, '') || 'document');
    const outputName = `${sanitizeFilename(baseName)}-${target}.${outputExtension}`;

    showDownload(outputName, resultContent, outputMime);
    showPreview(previewSourceText, translatedBlob.size);
    setProgress(100, 'Translation complete');
    setStatus(`Translation ready. The ${outputExtension.toUpperCase()} file was created in your browser.`, 'success');
  } catch (error) {
    hideProgress();
    if (error?.code === 'translator-create-timeout') {
      setStatus(`${error.message} If it still hangs, restart Chrome and clear site data for this page.`, 'error');
    } else {
      setStatus(error.message || 'Translation failed.', 'error');
    }
  } finally {
    if (translator && typeof translator.destroy === 'function') translator.destroy();
    isSubmitting = false;
    refreshPairSupportState();
  }
});

saveButton.addEventListener('click', async () => {
  if (!translatedBlob) {
    setStatus('Translate text first.', 'error');
    return;
  }

  if (!window.showSaveFilePicker) {
    fallbackDownload();
    setStatus('Your browser does not allow folder selection here. The file was sent to your default downloads folder.', 'success');
    return;
  }

  try {
    const lowerName = translatedFileName.toLowerCase();
    const isHtml = lowerName.endsWith('.html') || lowerName.endsWith('.htm');
    const handle = await window.showSaveFilePicker({
      suggestedName: translatedFileName,
      types: [
        {
          description: isHtml ? 'HTML file' : 'Text file',
          accept: isHtml
            ? { 'text/html': ['.html', '.htm'] }
            : { 'text/plain': ['.txt'] }
        }
      ]
    });
    const fileBytes = await translatedBlob.arrayBuffer();
    const writable = await handle.createWritable();
    await writable.write({ type: 'write', position: 0, data: fileBytes });
    await writable.truncate(fileBytes.byteLength);
    await writable.close();
    setStatus(`Saved ${translatedFileName} (${formatBytes(translatedBlob.size)}).`, 'success');
  } catch (error) {
    if (error.name === 'AbortError') {
      setStatus('Save canceled. The file is still ready below.', '');
      return;
    }
    fallbackDownload();
    setStatus('Direct save did not finish correctly, so the file was sent through the regular download button instead.', 'error');
  }
});
