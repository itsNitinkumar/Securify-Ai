import * as fs from 'fs';
import * as cheerio from 'cheerio';
import JSZip from 'jszip';
import { ReportTemplate } from '../../models/report.model';
import type { TemplateRenderer, ReportTemplateKey } from '../types';

interface DastRendererData {
  project: any;
  findings: any[];
  template: ReportTemplate;
  metadata: {
    generatedBy: string;
    generatedDate: string;
    reportVersion: string;
  };
}

const key: ReportTemplateKey = 'dast';

function matches(template: ReportTemplate): boolean {
  const rawKey = (template as any)?.template_data?.key;
  if (typeof rawKey === 'string' && rawKey.trim().toLowerCase() === 'dast') return true;
  const name = String((template as any)?.name || '').toLowerCase();
  if (name.includes('dast') || name.includes('dynamic analysis')) return true;
  return false;
}

function cheerioLoad(xml: string) {
  return cheerio.load(xml, { xmlMode: true } as any);
}

function escapeXmlText(text: string): string {
  let decoded = String(text)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
  return decoded
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function paraText($: any, el: any): string {
  return $(el).find('w\\:t').toArray().map((n: any) => $(n).text()).join('').trim();
}

function setParaText($: any, el: any, text: string) {
  const tNodes = $(el).find('w\\:t').toArray();
  if (!tNodes.length) return;
  $(tNodes[0]).replaceWith(`<w:t xml:space="preserve">${escapeXmlText(String(text ?? ''))}</w:t>`);
  for (let i = 1; i < tNodes.length; i++) $(tNodes[i]).text('');
}

function cloneNode($: any, el: any) {
  return cheerio.load($.xml(el), { xmlMode: true }).root().children().first();
}

function stripBoldMarkers(text: string): string {
  return String(text).replace(/\*\*/g, '');
}

function cleanTitle(title: string, isFP: boolean): string {
  let t = String(title || '');
  if (isFP) t = t.replace(/\s*-\s*False\s*Positive\s*$/i, '');
  return t;
}

function splitLabelBody(text: string): { label: string; body: string } | null {
  const t = String(text);
  const idx = t.indexOf(':');
  if (idx > 0 && idx < 80) {
    return { label: t.substring(0, idx + 1), body: t.substring(idx + 1).trimStart() };
  }
  return null;
}

function findChildByText($: any, body: any, text: string): any {
  const kids = body.children().toArray();
  for (let i = 0; i < kids.length; i++) {
    if (paraText($, kids[i]).toLowerCase() === text.toLowerCase()) return { el: kids[i], idx: i };
  }
  return null;
}

function severityFill(severity: string): string {
  const s = String(severity || '').toLowerCase();
  if (s === 'critical') return 'C00000';
  if (s === 'high') return 'FF0000';
  if (s === 'medium') return 'FFC000';
  if (s === 'low') return '00B050';
  return '2F80ED';
}

function severityTextColor(severity: string): string {
  const s = String(severity || '').toLowerCase();
  if (s === 'critical') return 'C00000';
  if (s === 'high') return 'FF0000';
  if (s === 'medium') return 'C59A00';
  if (s === 'low') return '70AD47';
  return '2F80ED';
}

function formatDate(date: Date, fmt: string): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const m = months[date.getMonth()];
  const d = date.getDate();
  const y = date.getFullYear();
  return fmt.replace('MMMM', m).replace('dd', String(d).padStart(2, '0')).replace('yyyy', String(y));
}

function slugifyBookmark(title: string, suffix?: string | number): string {
  let s = '_' + String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  if (suffix !== undefined) s += `_${suffix}`;
  if (s.length > 40) s = s.slice(0, 40);
  if (s === '_') s = '_bookmark';
  return s;
}

function wrapWithBookmark($: any, el: any, name: string, id: number): void {
  const safeName = String(name).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const bmStart = $('<w:bookmarkStart/>').attr('w:id', String(id)).attr('w:name', safeName);
  const bmEnd = $('<w:bookmarkEnd/>').attr('w:id', String(id));
  const pPr = $(el).children('w\\:pPr').first();
  if (pPr.length) {
    pPr.after(bmStart);
  } else {
    $(el).prepend(bmStart);
  }
  $(el).append(bmEnd);
  console.log(`[TOC DEBUG] Bookmarked paragraph: name="${safeName}", id=${id}`);
}


async function generateDocxBuffer(args: { templatePath: string; data: DastRendererData }): Promise<Buffer> {
  const { templatePath, data } = args;
  const templateBuf = fs.readFileSync(templatePath);
  const templateZip = await JSZip.loadAsync(templateBuf);
  const templateXml = await templateZip.file('word/document.xml')?.async('string');
  if (!templateXml) throw new Error('word/document.xml not found in template');
  const $ = cheerioLoad(templateXml);
  const body = $('w\\:body');

  // --- Fix fonts in styles.xml (Roboto) ---
  {
    const stylesXml = templateZip.file('word/styles.xml')?.async('string');
    if (stylesXml) {
      const stylesStr = await stylesXml;
      const $styles = cheerioLoad(stylesStr);
      const setFontsOn = (node: any) => {
        const n = $styles(node);
        if (!n.length) return;
        let rFonts = n.find('w\\:rFonts').first();
        if (!rFonts.length) {
          n.prepend('<w:rFonts/>');
          rFonts = n.find('w\\:rFonts').first();
        }
        rFonts.attr('w:ascii', 'Roboto');
        rFonts.attr('w:hAnsi', 'Roboto');
        rFonts.attr('w:cs', 'Roboto');
        rFonts.attr('w:eastAsia', 'Roboto');
      };
      const docDefaults = $styles('w\\:docDefaults w\\:rPrDefault w\\:rPr').first();
      if (docDefaults.length) setFontsOn(docDefaults);
      ['Normal', 'Heading1', 'Heading2', 'Heading3'].forEach((styleId) => {
        const style = $styles(`w\\:style[w\\:styleId="${styleId}"]`).first();
        const rPr = style.find('w\\:rPr').first();
        if (rPr.length) setFontsOn(rPr);
      });
      templateZip.file('word/styles.xml', Buffer.from($styles.xml()));
    }
  }

  // --- Enable auto-update of fields (TOC page numbers) on open ---
  {
    const settingsXml = templateZip.file('word/settings.xml')?.async('string');
    if (settingsXml) {
      const settingsStr = await settingsXml;
      const $settings = cheerioLoad(settingsStr);
      const settingsEl = $settings('w\\:settings').first();
      if (settingsEl.length) {
        if (!settingsEl.find('w\\:updateFields').length) {
          settingsEl.prepend('<w:updateFields w:val="true"/>');
        }
        templateZip.file('word/settings.xml', Buffer.from($settings.xml()));
      }
    }
  }

  // --- Recolor the "key" logo + header/footer gradient bars from blue to green ---
  const recolorKeyAndGrad = (xmlStr: string): string => {
    if (!xmlStr) return xmlStr;
    return xmlStr
      .replace(/<a:schemeClr val="accent1"\/>/g, '<a:srgbClr val="4ebc22"/>')
      .replace(/<a:schemeClr val="accent1"><\/a:schemeClr>/g, '<a:srgbClr val="4ebc22"/>');
  };

  // --- Replace placeholders ---
  const clientName = String(data.project?.client_name || 'Client');
  const projectName = String(data.project?.name || 'N/A');
  const startDate = data.project?.start_date ? formatDate(new Date(data.project.start_date), 'MMMM dd, yyyy') : '';
  const endDate = data.project?.end_date ? formatDate(new Date(data.project.end_date), 'MMMM dd, yyyy') : '';

  // Extract plain text from BlockNote rich_body JSON
  const richBodyToText = (richBody: any): string => {
    if (!richBody) return '';
    if (typeof richBody === 'string') return richBody;
    const walk = (node: any): string => {
      if (!node) return '';
      if (node.type === 'text') return node.text || '';
      if (node.type === 'paragraph' || node.type === 'heading') return (node.content || []).map(walk).join('');
      if (node.type === 'bulletListItem' || node.type === 'numberedListItem' || node.type === 'listItem') return '- ' + (node.content || []).map(walk).join('');
      if (Array.isArray(node)) return node.map(walk).join('\n');
      if (Array.isArray(node.content)) return node.content.map(walk).join('\n');
      return '';
    };
    try { return walk(richBody).trim(); } catch { return ''; }
  };

  const replacePlaceholders = (text: string): string => {
    return text
      .replace(/\{\{CLIENT_NAME\}\}/g, clientName)
      .replace(/\{\{COMPANY_NAME\}\}/g, clientName)
      .replace(/\{\{PROJECT_NAME\}\}/g, projectName)
      .replace(/\{\{DATE\}\}/g, startDate)
      .replace(/Start Date/g, startDate)
      .replace(/End Date/g, endDate)
      .replace(/SilentPush/gi, clientName);
  };

  const getBodyText = (sec: any): string => {
    let text = '';
    if (sec.body) text = sec.body;
    else if (sec.rich_body) text = richBodyToText(sec.rich_body);
    if (sec.items && Array.isArray(sec.items) && sec.items.length > 0) {
      const hasBullets = text.split('\n').some((line: string) => /^\s*(-|•)\s+/.test(line));
      if (!hasBullets) {
        const bulletLines = sec.items.map((item: string) => '- ' + item);
        text = text ? text + '\n' + bulletLines.join('\n') : bulletLines.join('\n');
      }
    }
    return text;
  };

  body.find('w\\:p').each((_: number, p: any) => {
    let txt = paraText($, p);
    if (!txt) return;
    let changed = false;
    // Replace {{...}} placeholders
    if (txt.includes('{{')) {
      txt = txt.replace(/\{\{CLIENT_NAME\}\}/g, clientName)
        .replace(/\{\{COMPANY_NAME\}\}/g, clientName)
        .replace(/\{\{PROJECT_NAME\}\}/g, projectName)
        .replace(/\{\{DATE\}\}/g, startDate);
      changed = true;
    }
    // Client name (case-insensitive SilentPush)
    if (txt.match(/SilentPush/i)) {
      txt = txt.replace(/SilentPush/gi, clientName);
      changed = true;
    }
    if (txt.includes('Client Name')) {
      txt = txt.replace(/Client Name/g, clientName);
      changed = true;
    }
    // Cover page date (standalone date paragraph → use startDate)
    if (txt.match(/^May (14|22),?\s*\d{4}$/)) {
      txt = startDate;
      changed = true;
    }
    // Scope assessment date
    if (txt.includes('The assessment was conducted between')) {
      txt = txt.replace(/May 14,?\s*\d{4}/g, startDate);
      txt = txt.replace(/May 15,?\s*\d{4}/g, endDate);
      changed = true;
    }
    // Start/End Date text placeholders
    if (txt.includes('Start Date') || txt.includes('End Date')) {
      txt = txt.replace(/Start Date/g, startDate).replace(/End Date/g, endDate);
      changed = true;
    }
    if (txt === 'Dynamic Analysis Security Test Report') {
      txt = String(data.project?.name || txt);
      changed = true;
    }
    if (changed) setParaText($, p, txt);
  });

  // Explicit bold for Heading1/Heading2 paragraphs
  body.find('w\\:p').each((_: number, p: any) => {
    const pStyle = $(p).find('w\\:pPr w\\:pStyle').first();
    if (!pStyle.length) return;
    const styleVal = String(pStyle.attr('w:val') || '');
    if (styleVal !== 'Heading1' && styleVal !== 'Heading2') return;
    $(p).find('w\\:r').each((__: number, r: any) => {
      let rPr = $(r).find('w\\:rPr').first();
      if (!rPr.length) {
        $(r).prepend('<w:rPr/>');
        rPr = $(r).find('w\\:rPr').first();
      }
      if (!rPr.find('w\\:b').length) rPr.prepend('<w:b/>');
      if (!rPr.find('w\\:bCs').length) rPr.prepend('<w:bCs/>');
    });
  });

  // --- Initialize bookmark ID counter ---
  let maxBmId = -1;
  body.find('w\\:bookmarkStart, w\\:bookmarkEnd').each((_: number, el: any) => {
    const id = parseInt(String($(el).attr('w:id') || '-1'), 10);
    if (id > maxBmId) maxBmId = id;
  });
  let nextBmId = maxBmId + 1;

  // Map: TOC entry title -> bookmark name (used for TP/FP finding bookmarks)
  const bookmarkNameMap = new Map<string, string>();

  // --- Wrap static section headings with unique bookmarks ---
  // These headings exist in the template body and won't be removed.
  // Bookmarks allow Word/Google Docs native TOC to detect them.
  const staticBookmarkTitles = [
    'Scope', 'Application Details', 'User Roles', 'Tools',
    'Assessment Limitation', 'Vulnerabilities', 'Summary', 'Detailed Vulnerabilities',
  ];
  for (const title of staticBookmarkTitles) {
    const p = body.find('w\\:p').filter((_: number, el: any) => {
      return paraText($, el).toLowerCase() === title.toLowerCase();
    }).first();
    if (p.length) {
      const bmName = slugifyBookmark(title);
      const bmId = nextBmId++;
      wrapWithBookmark($, p.get(0), bmName, bmId);
      bookmarkNameMap.set(title, bmName);
      console.log(`[DAST TOC] Bookmarked heading "${title}" → ${bmName} (id=${bmId})`);
    } else {
      console.warn(`[DAST TOC] Could not find heading paragraph for "${title}"`);
    }
  }

  // Remove yellow highlights
  body.find('w\\:highlight').remove();
  body.find('w\\:shd').each((_: number, shd: any) => {
    const fill = String($(shd).attr('w:fill') || '').toUpperCase();
    if (fill === 'FFFF00' || fill === 'FF0') $(shd).remove();
  });

  // ── Section content override from template_data.sections (single source of truth) ──
  {
    const buildFormattedRuns = (text: string, opts: { bold?: boolean; italic?: boolean; underline?: boolean; color?: string; font?: string } = {}): string => {
      const font = opts.font || 'Roboto';
      const makeR = (t: string, b: boolean, i: boolean, u: boolean): string => {
        const safe = escapeXmlText(t);
        if (!safe) return '';
        const rPr: string[] = [];
        if (b) rPr.push('<w:b/><w:bCs/>');
        if (i) rPr.push('<w:i/><w:iCs/>');
        if (u) rPr.push('<w:u w:val="single"/>');
        if (opts.color) rPr.push(`<w:color w:val="${opts.color}"/>`);
        rPr.push(`<w:rFonts w:ascii="${font}" w:hAnsi="${font}"/>`);
        return `<w:r><w:rPr>${rPr.join('')}</w:rPr><w:t xml:space="preserve">${safe}</w:t></w:r>`;
      };
      const runs: string[] = [];
      let bold = !!opts.bold, italic = !!opts.italic, underline = !!opts.underline;
      let buf = '';
      let idx = 0;
      while (idx < text.length) {
        if (text.substring(idx, idx + 3) === '***') {
          if (buf) { runs.push(makeR(buf, bold, italic, underline)); buf = ''; }
          bold = !bold; italic = !italic; idx += 3;
        } else if (text.substring(idx, idx + 2) === '__') {
          if (buf) { runs.push(makeR(buf, bold, italic, underline)); buf = ''; }
          underline = !underline; idx += 2;
        } else if (text.substring(idx, idx + 2) === '**') {
          if (buf) { runs.push(makeR(buf, bold, italic, underline)); buf = ''; }
          bold = !bold; idx += 2;
        } else if (text[idx] === '*') {
          if (buf) { runs.push(makeR(buf, bold, italic, underline)); buf = ''; }
          italic = !italic; idx += 1;
        } else {
          buf += text[idx]; idx++;
        }
      }
      if (buf) runs.push(makeR(buf, bold, italic, underline));
      return runs.join('');
    };

    // Generate a table XML from DB table data
    const generateTableXml = (tableData: { title?: string; headers: string[]; rows: string[][] }): string => {
      const colCount = tableData.headers.length;
      if (colCount === 0) return '';
      const gridCols = Array.from({ length: colCount }, () => '  <w:gridCol w:w="9000"/>').join('\n');
      const buildRow = (cells: string[], isHeader: boolean): string => {
        const tcs = cells.map(rawCellText => {
          const cellText = replacePlaceholders(rawCellText);
          const runsXml = isHeader
            ? buildFormattedRuns(cellText, { bold: true, color: 'FFFFFF', font: 'Roboto' })
            : buildFormattedRuns(cellText, { font: 'Roboto' });
          const parasXml = `<w:p><w:pPr><w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/></w:pPr>${runsXml}</w:p>`;
          return [
            '        <w:tc>',
            isHeader ? '          <w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="002060"/><w:tcW w:w="9000" w:type="dxa"/></w:tcPr>' : '          <w:tcPr><w:tcW w:w="9000" w:type="dxa"/></w:tcPr>',
            parasXml, '        </w:tc>',
          ].join('\n');
        });
        return ['      <w:tr>', isHeader ? '        <w:tblHeader/>' : '', ...tcs, '      </w:tr>'].filter(Boolean).join('\n');
      };
      const headerRow = buildRow(tableData.headers, true);
      const dataRows = tableData.rows.map(row => {
        const padded = [...row];
        while (padded.length < colCount) padded.push('');
        return buildRow(padded.slice(0, colCount), false);
      });
      const tblPr = '<w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr>';
      return ['<w:tbl>', tblPr, '    <w:tblGrid>', gridCols, '    </w:tblGrid>', '    <w:tblBody>', headerRow, ...dataRows, '    </w:tblBody>', '</w:tbl>'].join('\n');
    };

    // Check if a DOCX table already exists between a heading and the next heading
    const hasDocxTableBetween = (startNode: any): boolean => {
      let scan = $(startNode).next();
      while (scan.length) {
        const n = scan[0];
        const nTag = n.tagName || n.name || '';
        if (nTag === 'w:tbl') return true;
        if (nTag === 'w:p') {
          const s = $(n).find('w\\:pPr > w\\:pStyle').attr('w:val');
          if (s === 'Heading1' || s === 'Heading2') break;
        }
        if (nTag === 'w:sectPr') break;
        scan = scan.next();
      }
      return false;
    };

    const templateSections = data.template?.template_data?.sections || {};
    const contentMap = new Map<string, any>();
    for (const [key, section] of Object.entries(templateSections)) {
      const sec = section as any;
      if (sec && typeof sec === 'object' && (sec.body || sec.rich_body || sec.tables)) {
        contentMap.set(key.toLowerCase(), sec);
        if (sec.title && sec.title.toLowerCase() !== key.toLowerCase()) {
          contentMap.set(sec.title.toLowerCase(), sec);
        }
      }
    }

    // Process H1 sections
    const allChildren = body.children().toArray();
    let i = 0;
    while (i < allChildren.length) {
      const node = allChildren[i];
      const tagName = node.tagName || node.name || '';
      if (tagName !== 'w:p') { i++; continue; }
      const isH1 = $(node).find('w\\:pPr > w\\:pStyle').attr('w:val') === 'Heading1';
      if (!isH1) { i++; continue; }
      const headingText = paraText($, node);
      if (!headingText) { i++; continue; }
      // Skip dynamic sections
      if (/detailed vulnerabilities|true positive|false positive/i.test(headingText)) { i++; continue; }
      const dbSection = contentMap.get(headingText.toLowerCase());
      if (!dbSection) { i++; continue; }
      if (!dbSection.body && !dbSection.rich_body && (!dbSection.tables || dbSection.tables.length === 0)) { i++; continue; }

      // Only remove paragraphs, preserve DOCX tables
      const parasToRemove: any[] = [];
      let j = i + 1;
      while (j < allChildren.length) {
        const next = allChildren[j];
        const nextTag = next.tagName || next.name || '';
        if (nextTag === 'w:p') {
          const nextStyle = $(next).find('w\\:pPr > w\\:pStyle').attr('w:val');
          if (nextStyle === 'Heading1') break;
          if (nextStyle === 'Heading2') { j++; continue; }
          parasToRemove.push(next);
        }
        j++;
      }
      for (const el of parasToRemove) $(el).remove();

      const dbContent = getBodyText(dbSection);
      const dbLines = dbContent.split('\n').filter((l: string) => l.trim());
      let insertAfterNode = $(node);
      for (const line of dbLines) {
        const isBullet = line.startsWith('- ');
        const rawText = isBullet ? line.substring(2) : line;
        const text = replacePlaceholders(rawText);
        const runsXml = buildFormattedRuns(text, { font: 'Roboto' });
        const pPrXml = isBullet
          ? '<w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:before="0" w:after="60" w:line="276" w:lineRule="auto"/></w:pPr>'
          : '<w:pPr><w:spacing w:before="0" w:after="120" w:line="276" w:lineRule="auto"/></w:pPr>';
        insertAfterNode.after(`<w:p>${pPrXml}${runsXml}</w:p>`);
        insertAfterNode = insertAfterNode.next();
      }
      // Insert DB tables only if no DOCX table already exists in this section
      if (dbSection.tables && dbSection.tables.length > 0 && !hasDocxTableBetween(node)) {
        for (const tblData of dbSection.tables) {
          if (!tblData.headers || tblData.headers.length === 0) continue;
          const tblXml = generateTableXml(tblData);
          insertAfterNode.after(tblXml);
          insertAfterNode = insertAfterNode.next();
        }
      }
      i = j;
    }

    // Process H2 sub-sections
    const allParasNow = $('w\\:p').toArray();
    for (const p of allParasNow) {
      const style = $(p).find('w\\:pPr > w\\:pStyle').attr('w:val');
      if (style !== 'Heading2') continue;
      const headingText = paraText($, p);
      if (!headingText) continue;
      const dbSection = contentMap.get(headingText.toLowerCase());
      if (!dbSection) continue;
      if (!dbSection.body && !dbSection.rich_body && (!dbSection.tables || dbSection.tables.length === 0)) continue;

      // Only remove paragraphs, preserve DOCX tables
      let nextSib = $(p).next();
      while (nextSib.length) {
        const n = nextSib[0];
        const nTag = n.tagName || n.name || '';
        if (nTag === 'w:p') {
          const ns = $(n).find('w\\:pPr > w\\:pStyle').attr('w:val');
          if (ns === 'Heading1' || ns === 'Heading2') break;
          const toRemove = nextSib;
          nextSib = nextSib.next();
          toRemove.remove();
          continue;
        }
        if (nTag === 'w:sectPr') {
          nextSib = nextSib.next();
          continue;
        }
        nextSib = nextSib.next();
      }

      let insertAfter = $(p);
      const dbContent = getBodyText(dbSection);
      const dbLines = dbContent.split('\n').filter((l: string) => l.trim());
      for (const line of dbLines) {
        const isBullet = line.startsWith('- ');
        const rawText = isBullet ? line.substring(2) : line;
        const text = replacePlaceholders(rawText);
        const runsXml = buildFormattedRuns(text, { font: 'Roboto' });
        const pPrXml = isBullet
          ? '<w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:before="0" w:after="60" w:line="276" w:lineRule="auto"/></w:pPr>'
          : '<w:pPr><w:spacing w:before="0" w:after="120" w:line="276" w:lineRule="auto"/></w:pPr>';
        insertAfter.after(`<w:p>${pPrXml}${runsXml}</w:p>`);
        insertAfter = insertAfter.next();
      }
      // Insert DB tables only if no DOCX table already exists in this H2 section
      if (dbSection.tables && dbSection.tables.length > 0 && !hasDocxTableBetween(p)) {
        for (const tblData of dbSection.tables) {
          if (!tblData.headers || tblData.headers.length === 0) continue;
          const tblXml = generateTableXml(tblData);
          insertAfter.after(tblXml);
          insertAfter = insertAfter.next();
        }
      }
    }
  }

  // --- Populate scope tables ---
  const allTables = body.find('w\\:tbl').toArray();

  // Helper: populate a 2-column table (0=name, 1=value) with data rows
  const populateTable = (tblEl: any, rowsData: Array<[string, string]>) => {
    if (!tblEl) return;
    const $tbl = cheerioLoad($.xml(tblEl));
    const rows = $tbl('w\\:tr').toArray();
    while (rows.length > 1) { $tbl(rows.pop()!).remove(); }
    for (const [col0, col1] of rowsData) {
      const newRow = cheerioLoad($.xml(rows[0]));
      const cells = newRow('w\\:tc').toArray();
      if (cells[0]) setParaText(newRow, cells[0], col0);
      if (cells[1]) setParaText(newRow, cells[1], col1);
      $tbl('w\\:tbl').append(newRow('w\\:tr'));
    }
    $(tblEl).replaceWith($tbl('w\\:tbl'));
  };

  const appDetails = data.project?.application_details || [];
  populateTable(allTables[0], appDetails.map((a: any) => [String(a.name || ''), String(a.url || '')]));

  const tables2 = body.find('w\\:tbl').toArray();
  const userRoles = data.project?.user_roles || [];
  populateTable(tables2[1], userRoles.map((r: any) => [String(r.role || ''), String(r.username || '')]));

  const tables4 = body.find('w\\:tbl').toArray();
  const toolRows = (Array.isArray(data.project?.tool_rows) && data.project!.tool_rows.length > 0)
    ? data.project!.tool_rows
    : (Array.isArray((data.template as any)?.template_data?.scope_tools) ? (data.template as any).template_data.scope_tools
      : [{ name: 'Burp Professional Pro', description: 'An advanced proxy for testing web security.' },
        { name: 'OpenSSL', description: 'An open-source package to assess security in transit.' },
        { name: 'Nmap', description: 'A tool used to discover hosts and services on a network.' },
        { name: 'SQLMap', description: 'Python-based CLI tool that identifies SQL injection issues.' },
        { name: 'Acunetix Pro', description: 'An automated scanner to perform authenticated scans on web app / APIs.' },
        { name: 'cURL Utility', description: 'Command line utility to perform HTTP/s requests.' }]);
  populateTable(tables4[2], toolRows.map((t: any) => [String(t.name || ''), String(t.description || '')]));

  // --- Populate summary table (table index 3) ---
  const tables5 = body.find('w\\:tbl').toArray();
  const summaryTbl = tables5[3];
  if (summaryTbl) {
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, informational: 4, info: 4, none: 5 };
    const sortedFindings = [...(data.findings || [])].sort((a: any, b: any) => {
      const sa = String(a.severity || '').toLowerCase();
      const sb = String(b.severity || '').toLowerCase();
      return (severityOrder[sa] ?? 5) - (severityOrder[sb] ?? 5);
    });

    const $summaryTbl = cheerioLoad($.xml(summaryTbl));
    const sumRows = $summaryTbl('w\\:tr').toArray();
    if (sumRows.length >= 2) {
      const templateRow = sumRows[1];
      sumRows.slice(1).forEach((row: any) => $summaryTbl(row).remove());

      // Set column widths: 60% / 20% / 20%
      const setTcWidth = (tc: any, pct: string) => {
        let tcPr = $summaryTbl(tc).find('w\\:tcPr').first();
        if (!tcPr.length) { $summaryTbl(tc).prepend('<w:tcPr/>'); tcPr = $summaryTbl(tc).find('w\\:tcPr').first(); }
        let tcW = tcPr.find('w\\:tcW').first();
        if (!tcW.length) { tcPr.prepend('<w:tcW/>'); tcW = tcPr.find('w\\:tcW').first(); }
        tcW.attr('w:type', 'pct');
        tcW.attr('w:w', pct);
      };
      $summaryTbl('> w\\:tr').each((_: number, tr: any) => {
        const tcs = $summaryTbl(tr).find('> w\\:tc').toArray();
        if (tcs[0]) setTcWidth(tcs[0], '3000');
        if (tcs[1]) setTcWidth(tcs[1], '1000');
        if (tcs[2]) setTcWidth(tcs[2], '1000');
      });

      for (const finding of sortedFindings) {
        const isFP = String(finding.finding_type || '') === 'false_positive';
        const newRow = cloneNode($summaryTbl, templateRow);
        const cells = newRow.find('w\\:tc').toArray();
        if (cells[0]) setParaText($summaryTbl, cells[0], cleanTitle(finding.title, isFP));
        if (cells[1]) {
          const status = isFP ? 'False-Positive' : 'True-Positive';
          setParaText($summaryTbl, cells[1], status);
        }
        if (cells[2]) {
          if (isFP) {
            setParaText($summaryTbl, cells[2], '');
            $summaryTbl(cells[2]).find('w\\:shd').remove();
          } else {
            setParaText($summaryTbl, cells[2], String(finding.severity || ''));
            newRow.find('w\\:tc').eq(2).find('w\\:shd').attr('w:fill', severityFill(finding.severity));
          }
        }
        if (isFP) {
          newRow.find('w\\:shd').remove();
          const statusCell = newRow.find('w\\:tc').eq(1);
          const statusRun = statusCell.find('w\\:r').first();
          if (statusRun.length) {
            let rPr = statusRun.find('w\\:rPr').first();
            if (!rPr.length) { statusRun.prepend('<w:rPr/>'); rPr = statusRun.find('w\\:rPr').first(); }
            let color = rPr.find('w\\:color').first();
            if (!color.length) { rPr.append('<w:color w:val="4ebc22"/>'); }
            else { color.attr('w:val', '4ebc22'); }
          }
        }
        $summaryTbl('w\\:tbl').append(newRow);
      }

      $summaryTbl('w\\:tr').each((_: number, tr: any) => {
        const status = paraText($summaryTbl, $summaryTbl(tr).find('w\\:tc').eq(1)).toLowerCase();
        if (status === 'false-positive') {
          const riskCell = $summaryTbl(tr).find('w\\:tc').eq(2);
          setParaText($summaryTbl, riskCell, '');
          riskCell.find('w\\:shd').remove();
        }
      });
    }
    $(summaryTbl).replaceWith($summaryTbl('w\\:tbl'));
  }

  // --- Evidence image helpers ---
  const relsPath = 'word/_rels/document.xml.rels';
  const relsXmlStr = await templateZip.file(relsPath)?.async('string') || '';
  const $rels = cheerioLoad(relsXmlStr || '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>');

  let docPrCounter = 1;

  const nextRelId = (): string => {
    const ids = new Set<string>();
    $rels('Relationship').each((_: number, r: any) => {
      ids.add(String($rels(r).attr('Id') || ''));
    });
    let n = 1;
    while (ids.has(`rId${n}`)) n++;
    return `rId${n}`;
  };

  const addImageRel = (target: string): string => {
    const id = nextRelId();
    $rels('Relationships').first().append(
      `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${target}"/>`
    );
    return id;
  };

  const downloadImage = async (imageKey: string): Promise<Buffer | null> => {
    try {
      const s3Service = (await import('../../services/s3.service')).default;
      const signedUrl = await s3Service.getSignedUrl(imageKey, 3600);
      const https = require('https');
      const http = require('http');
      const protocol = signedUrl.startsWith('https') ? https : http;
      return await new Promise<Buffer>((resolve, reject) => {
        protocol.get(signedUrl, (res: any) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        }).on('error', reject);
      });
    } catch (err) {
      console.error('[DAST Renderer] Failed to download image:', err);
      return null;
    }
  };

  const buildImageParagraph = (rId: string, cx: number, cy: number): string => {
    const docPrId = docPrCounter++;
    return `<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:lineRule="auto"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${docPrId}" name="Picture ${docPrId}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="image"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  };

  const emuPerInch = 914400;
  const pxPerInch = 96;
  const pxToEmu = (px: number) => Math.max(1, Math.round((px / pxPerInch) * emuPerInch));

  // --- Populate detailed findings ---
  const allKids = body.children().toArray();
  const detailedMatch = findChildByText($, body, 'Detailed Vulnerabilities');
  const detailedIdx = detailedMatch?.idx ?? -1;

  if (detailedIdx >= 0) {
    const detailNodes = allKids.slice(detailedIdx + 1);

    // Find TP and FP section boundaries (within detailNodes indices)
    let tpHeading = -1;
    let tpBodyStart = -1;
    let tpBodyEnd = -1;
    let fpHeading = -1;
    let fpBodyStart = -1;
    let fpBodyEnd = -1;

    for (let i = 0; i < detailNodes.length; i++) {
      const txt = paraText($, detailNodes[i]);
      if (txt === 'True Positive') { tpHeading = i; tpBodyStart = i + 1; }
      if (txt === 'False Positive') { fpHeading = i; fpBodyStart = i + 1; }
      if (txt.toLowerCase() === 'back to summary') {
        if (tpBodyStart >= 0 && tpBodyEnd < 0 && fpHeading < 0) tpBodyEnd = i;
        if (fpBodyStart >= 0 && fpBodyEnd < 0) fpBodyEnd = i;
      }
    }

    // Body prototypes (without heading)
    const tpBodyProto = (tpBodyStart >= 0 && tpBodyEnd >= 0)
      ? detailNodes.slice(tpBodyStart, tpBodyEnd + 1)
      : null;
    const fpBodyProto = (fpBodyStart >= 0 && fpBodyEnd >= 0)
      ? detailNodes.slice(fpBodyStart, fpBodyEnd + 1)
      : null;

    // Save heading elements before removal
    const tpHeadingEl = tpHeading >= 0 ? detailNodes[tpHeading] : null;
    const fpHeadingEl = fpHeading >= 0 ? detailNodes[fpHeading] : null;

    // Force Heading2 style on TP heading element (no bottom border, smaller size)
    if (tpHeadingEl) {
      let pPr = $(tpHeadingEl).children('w\\:pPr').first();
      if (!pPr.length) {
        $(tpHeadingEl).prepend('<w:pPr/>');
        pPr = $(tpHeadingEl).children('w\\:pPr').first();
      }
      const pStyle = pPr.find('w\\:pStyle');
      if (pStyle.length) {
        pStyle.attr('w:val', 'Heading2');
      } else {
        pPr.prepend('<w:pStyle w:val="Heading2"/>');
      }
      // Explicitly suppress the bottom border (Heading1 in this template draws
      // a green underline; we want TP/FP to be flush).
      pPr.find('w\\:pBdr').remove();
    }

    // Force Heading2 style on FP heading element (no bottom border, smaller size)
    if (fpHeadingEl) {
      let pPr = $(fpHeadingEl).children('w\\:pPr').first();
      if (!pPr.length) {
        $(fpHeadingEl).prepend('<w:pPr/>');
        pPr = $(fpHeadingEl).children('w\\:pPr').first();
      }
      const pStyle = pPr.find('w\\:pStyle');
      if (pStyle.length) {
        pStyle.attr('w:val', 'Heading2');
      } else {
        pPr.prepend('<w:pStyle w:val="Heading2"/>');
      }
      pPr.find('w\\:pBdr').remove();
    }

    // Find sectPr before removing detail nodes
    const sectPrFromDetail = detailNodes.find((el: any) => el.tagName === 'w:sectPr');

    // Find the bookmarkEnd for "Detailed Vulnerabilities" so we don't orphan its bookmarkStart
    const dvBmStart = body.find('w\\:bookmarkStart[w\\:name="_detailed_vulnerabilities"]').first();
    const dvBmId = dvBmStart.length ? parseInt(String($(dvBmStart).attr('w:id')), 10) : -1;

    // Remove all detail nodes (except sectPr and the bookmarkEnd for Detailed Vulnerabilities)
    for (const el of detailNodes) {
      if (el === sectPrFromDetail) continue;
      if (el.tagName === 'w:bookmarkEnd' && parseInt(String($(el).attr('w:id')), 10) === dvBmId) continue;
      $(el).remove();
    }

    // Insert real findings
    const findings = data.findings || [];
    const tpFindings = findings.filter((f: any) => String(f.finding_type || '') !== 'false_positive');
    const fpFindings = findings.filter((f: any) => String(f.finding_type || '') === 'false_positive');

    const insertTarget = body.children('w\\:sectPr').first().get(0) || allKids[allKids.length - 1];

    const makeSectionDoc = (proto: any[]) => {
      const sd = cheerio.load('<root/>', { xmlMode: true });
      const sr = sd('root');
      for (const node of proto) {
        sr.append($.xml(cloneNode($, node)));
      }
      return sd;
    };

    const sectionFindByText = (sd: any, text: string) => {
      const kids = sd('root').children().toArray();
      const lower = text.toLowerCase().replace(/:$/, '');
      return kids.find((el: any) => {
        const t = sd(el).find('w\\:t').toArray().map((n: any) => sd(n).text()).join('').trim().toLowerCase().replace(/:$/, '');
        return t === lower;
      });
    };

    const sectionSetText = (sd: any, el: any, text: string) => {
      const runs = sd(el).find('w\\:t').toArray();
      if (!runs.length) return;
      sd(runs[0]).replaceWith(`<w:t xml:space="preserve">${escapeXmlText(String(text ?? ''))}</w:t>`);
      for (let ri = 1; ri < runs.length; ri++) sd(runs[ri]).text('');
    };

    const knownLabels = ['risk', 'description', 'affected url', 'affected target', 'impact', 'likelihood', 'impact & likelihood', 'impact and likelihood', 'steps to reproduce', 'recommendations', 'references', 'evidence', 'back to summary'];

    const findContentTemplate = (sd: any, sr: any, labelEl: any, prefixFilter?: string): string | null => {
      const kids = sr.children().toArray();
      const startIdx = kids.indexOf(labelEl);
      if (startIdx < 0) return null;
      let endIdx = -1;
      for (let j = startIdx + 1; j < kids.length; j++) {
        const t = sd(kids[j]).find('w\\:t').toArray().map((n: any) => sd(n).text()).join('').trim().toLowerCase().replace(/:$/, '');
        if (knownLabels.includes(t)) { endIdx = j; break; }
      }
      if (endIdx < 0) return null;
      const contentItems = kids.slice(startIdx + 1, endIdx);
      if (!contentItems.length) return null;
      if (prefixFilter) {
        const match = contentItems.find((el: any) => {
          const t = sd(el).find('w\\:t').toArray().map((n: any) => sd(n).text()).join('').trim().toLowerCase();
          return t.startsWith(prefixFilter.toLowerCase());
        });
        if (match) return sd.xml(match);
      }
      // Prefer first item without ALL-bold runs (avoids bold label bleed)
      const plain = contentItems.find((el: any) => {
        const runs = sd(el).find('w\\:r').toArray();
        return runs.length === 0 || !runs.every((r: any) => sd(r).find('w\\:b').length > 0);
      });
      return sd.xml(plain || contentItems[0]);
    };

    const removeBetweenLabels = (
      sd: any,
      sr: any,
      labelEl: any,
      newItems: string[],
      customTemplateXml?: string,
      opts?: { bullet?: boolean }
    ) => {
      if (!labelEl) return;
      const kids = sr.children().toArray();
      const startIdx = kids.indexOf(labelEl);
      if (startIdx < 0) return;
      let endIdx = -1;
      for (let j = startIdx + 1; j < kids.length; j++) {
        const t = sd(kids[j]).find('w\\:t').toArray().map((n: any) => sd(n).text()).join('').trim().toLowerCase().replace(/:$/, '');
        if (knownLabels.includes(t)) { endIdx = j; break; }
      }
      if (endIdx < 0) return;
      const toRemove = kids.slice(startIdx + 1, endIdx);
      const templateXml = customTemplateXml || findContentTemplate(sd, sr, labelEl) || sd.xml(labelEl);
      for (const el of toRemove) sd(el).remove();
      let insertAnchor = labelEl;
      for (const item of newItems) {
        const p = cheerio.load(templateXml, { xmlMode: true }).root().children().first();
        const tNodes = sd(p).find('w\\:t').toArray();
        if (tNodes.length > 0) {
          // Remove any stray bullet glyphs from the template content so the new
          // bullet stays at the front of the paragraph, not the end.
          for (const tNode of tNodes) {
            const cleaned = String(sd(tNode).text() || '').replace(/[•●]/g, '').trimStart();
            sd(tNode).text(cleaned);
          }
          sd(tNodes[0]).replaceWith(`<w:t xml:space="preserve">${escapeXmlText(String(item ?? ''))}</w:t>`);
          for (let ri = 1; ri < tNodes.length; ri++) sd(tNodes[ri]).text('');
        }

        if (opts?.bullet) {
          const pPr = p.children('w\\:pPr').first();
           if (pPr.length) {
            pPr.find('w\\:numPr').remove();
            // Use the template's built-in numbering (numId=7 = green bullet ●)
            pPr.append('<w:numPr><w:ilvl w:val="0"/><w:numId w:val="7"/></w:numPr>');
            let ind = pPr.find('w\\:ind').first();
            if (!ind.length) {
              pPr.append('<w:ind w:left="720" w:hanging="360"/>');
            } else {
              ind.attr('w:left', '720');
              ind.attr('w:hanging', '360');
            }
          }
        }
        sd(insertAnchor).after(p);
        insertAnchor = p.get(0);
      }
    };

    const findTitlePara = (sd: any, sectionRoot: any) => {
      const kids = sectionRoot.children().toArray();
      for (const p of kids) {
        const txt = sd(p).find('w\\:t').toArray().map((n: any) => sd(n).text()).join('').trim().toLowerCase();
        if (txt.endsWith(':') || txt.startsWith('risk') || txt === 'back to summary') break;
        if (txt.length > 0) return p;
      }
      return kids[0];
    };

    // Insert "True Positive" heading once, then TP findings
    if (tpBodyProto && tpFindings.length > 0) {
      if (tpHeadingEl) {
        const tpBmName = bookmarkNameMap.get('True Positive') || '_true_positive';
        $(insertTarget).before($.xml(tpHeadingEl));
        const insertedTp = body.find('w\\:p').filter((_: number, el: any) => {
          return paraText($, el) === 'True Positive' && $(el).find('w\\:pStyle[w\\:val="Heading2"]').length > 0;
        }).first();
        if (insertedTp.length) {
          const tpBmId = nextBmId++;
          wrapWithBookmark($, insertedTp.get(0), tpBmName, tpBmId);
          console.log(`[DAST TOC] Inserted "True Positive" heading with bookmark → ${tpBmName} (id=${tpBmId})`);
        }
      }
      for (let i = 0; i < tpFindings.length; i++) {
        const finding = tpFindings[i];
        const sd = makeSectionDoc(tpBodyProto);
        const sr = sd('root');
        const titlePara = findTitlePara(sd, sr);
        const riskPara = sectionFindByText(sd, 'Risk:') || (() => {
          const rkids = sr.children().toArray();
          return rkids.find((el: any) => {
            const t = sd(el).find('w\\:t').toArray().map((n: any) => sd(n).text()).join('').trim().toLowerCase();
            return t.startsWith('risk:');
          });
        })();
        const descLabel = sectionFindByText(sd, 'Description:');
        const urlLabel = sectionFindByText(sd, 'Affected URL:') || sectionFindByText(sd, 'Affected Target:');
        const impactLabel = sectionFindByText(sd, 'Impact:');
        const likelihoodLabel = sectionFindByText(sd, 'Likelihood:');
        const stepsLabel = sectionFindByText(sd, 'Steps to Reproduce:');
        const recLabel = sectionFindByText(sd, 'Recommendations:');
        const refLabel = sectionFindByText(sd, 'References:');

        if (titlePara) {
          sectionSetText(sd, titlePara, cleanTitle(finding.title, false));
          // Apply Heading2 so finding appears as sub-entry under TP in TOC
          let tpPPr = sd(titlePara).children('w\\:pPr').first();
          if (!tpPPr.length) {
            sd(titlePara).prepend('<w:pPr/>');
            tpPPr = sd(titlePara).children('w\\:pPr').first();
          }
          if (!tpPPr.find('w\\:pStyle').length) {
            tpPPr.prepend('<w:pStyle w:val="Heading2"/>');
          }
        }

        if (riskPara) {
          const severity = String(finding.severity || '');
          const riskChildren = sd(riskPara).find('w\\:t').toArray();
          const sevIdx = riskChildren.length - 1; // Last <w:t> has severity value
          if (sevIdx >= 0) {
            sd(riskChildren[sevIdx]).text(severity);
            const run = sd(riskChildren[sevIdx]).parent('w\\:r');
            let rPrRun = run.find('w\\:rPr').first();
            if (!rPrRun.length) { run.prepend('<w:rPr/>'); rPrRun = run.find('w\\:rPr').first(); }
            let colorNode = rPrRun.find('w\\:color').first();
            if (!colorNode.length) { rPrRun.append(`<w:color w:val="${severityTextColor(severity)}"/>`); }
            else { colorNode.attr('w:val', severityTextColor(severity)); }
          }
        }

        if (descLabel) {
          const desc = String(finding.description || finding.detail || '');
          removeBetweenLabels(sd, sr, descLabel, desc ? [desc] : ['No description provided.']);
        }
        if (urlLabel) {
          const urls: string[] = [];
          if (Array.isArray(finding.affected_urls)) urls.push(...finding.affected_urls.map((u: any) => String(u.url || u)));
          else if (finding.affected_url) urls.push(String(finding.affected_url));
          else if (finding.affected_target) urls.push(String(finding.affected_target));
          removeBetweenLabels(sd, sr, urlLabel, urls.length ? urls : ['N/A'], undefined, { bullet: true });
        }
        // Handle combined "Impact & Likelihood:" with bold labels
        const impactLikeLabel = sectionFindByText(sd, 'Impact & Likelihood:') || sectionFindByText(sd, 'Impact and Likelihood:');
        if (impactLikeLabel) {
          const impact = String(finding.impact?.detail || finding.impact || '');
          const likelihood = String(finding.likelihood?.detail || finding.likelihood || '');
          // Remove content between label and next label
          const ilKids = sr.children().toArray();
          const ilIdx = ilKids.indexOf(impactLikeLabel);
          if (ilIdx >= 0) {
            let ilEnd = -1;
            for (let j = ilIdx + 1; j < ilKids.length; j++) {
              const t = sd(ilKids[j]).find('w\\:t').toArray().map((n: any) => sd(n).text()).join('').trim().toLowerCase().replace(/:$/, '');
              if (knownLabels.includes(t)) { ilEnd = j; break; }
            }
            if (ilEnd > ilIdx) {
              for (const el of ilKids.slice(ilIdx + 1, ilEnd)) sd(el).remove();
            }
          }
          let insertPt = impactLikeLabel;
          if (impact) {
            const sev = String(finding.impact?.severity || '').trim();
            const sevPrefix = sev ? `${sev} – ` : '';
            const xml = `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="7"/></w:numPr><w:spacing w:after="120" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">Impact:</w:t></w:r><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${sevPrefix}</w:t></w:r><w:r><w:rPr><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${escapeXmlText(impact)}</w:t></w:r></w:p>`;
            sd(insertPt).after(xml);
            insertPt = sd(insertPt).next().get(0);
          }
          if (likelihood) {
            const sev = String(finding.likelihood?.severity || '').trim();
            const xml = `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="7"/></w:numPr><w:spacing w:after="120" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">Likelihood:</w:t></w:r><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${sev ? `${sev} – ` : ''}</w:t></w:r><w:r><w:rPr><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${escapeXmlText(likelihood)}</w:t></w:r></w:p>`;
            sd(insertPt).after(xml);
          }
        }
        if (impactLabel && !impactLikeLabel) {
          const impact = String(finding.impact?.detail || finding.impact || '');
          removeBetweenLabels(sd, sr, impactLabel, impact ? [impact] : []);
        }
        if (likelihoodLabel && !impactLikeLabel) {
          const likelihood = String(finding.likelihood?.detail || finding.likelihood || '');
          removeBetweenLabels(sd, sr, likelihoodLabel, likelihood ? [likelihood] : []);
        }
        // Steps: add step numbers with images and captions
        const stepTemplate = stepsLabel ? findContentTemplate(sd, sr, stepsLabel, 'step') : null;
        if (stepsLabel) {
          const steps_raw = Array.isArray(finding.steps_to_reproduce) ? finding.steps_to_reproduce : [];
          const steps = (() => {
            if (steps_raw.length > 0 && typeof steps_raw[0] === 'object' && steps_raw[0] !== null && 'description' in steps_raw[0]) {
              return steps_raw.map((s: any, idx: number) => ({
                stepNumber: s.stepNumber || idx + 1,
                description: String(s.description || ''),
                imageKey: s.imageKey || s.image,
                caption: s.caption,
              })).filter((s: any) => s.description);
            }
            return steps_raw.map((s: any, idx: number) => ({
              stepNumber: idx + 1,
              description: typeof s === 'object' ? String(s.description || s.step || s.title || '') : String(s),
            })).filter((s: any) => s.description);
          })();
          if (steps.length > 0) {
            const stKids = sr.children().toArray();
            const stIdx = stKids.indexOf(stepsLabel);
            if (stIdx >= 0) {
              let stEnd = -1;
              for (let j = stIdx + 1; j < stKids.length; j++) {
                const t = sd(stKids[j]).find('w\\:t').toArray().map((n: any) => sd(n).text()).join('').trim().toLowerCase().replace(/:$/, '');
                if (knownLabels.includes(t)) { stEnd = j; break; }
              }
              if (stEnd > stIdx) {
                for (const el of stKids.slice(stIdx + 1, stEnd)) sd(el).remove();
              }
            }
            let stAnchor = stepsLabel;
            for (const step of steps) {
              const p = cheerio.load(stepTemplate || sd.xml(stepsLabel), { xmlMode: true }).root().children().first();
              // Remove page breaks from step template to avoid each step on its own page
              p.find('w\\:br[w\\:type="page"]').remove();
              const pPrP = p.find('w\\:pPr').first();
              if (pPrP.length) pPrP.find('w\\:pageBreakBefore').remove();
              // Add spacing after each step for breathing room
              const stPPr = p.find('w\\:pPr').first();
              if (!stPPr.length) {
                p.prepend('<w:pPr><w:spacing w:after="120"/></w:pPr>');
              } else {
                let stSp = stPPr.find('w\\:spacing').first();
                if (!stSp.length) { stPPr.append('<w:spacing w:after="120"/>'); }
                else { stSp.attr('w:after', '120'); }
              }
              const runs = sd(p).find('w\\:r').toArray();
              let labelRun: any = null;
              let descRun: any = null;
              for (const r of runs) {
                const isBold = sd(r).find('w\\:b').length > 0;
                const rText = sd(r).find('w\\:t').toArray().map((t: any) => sd(t).text()).join('');
                if (isBold && rText.trim().length > 0 && !labelRun) labelRun = r;
                if (!isBold && rText.trim().length > 0 && !descRun) descRun = r;
              }
              if (labelRun && descRun) {
                const labelT = sd(labelRun).find('w\\:t').first();
                if (labelT.length) labelT.text(`Step ${step.stepNumber}: `);
                const descT = sd(descRun).find('w\\:t').first();
                if (descT.length) descT.text(step.description);
                for (const r of runs) {
                  if (r !== labelRun && r !== descRun) {
                    sd(r).find('w\\:t').each((_: any, t: any) => { sd(t).text(''); });
                  }
                }
              } else {
                const tNodes = sd(p).find('w\\:t').toArray();
                if (tNodes.length > 0) {
                  sd(tNodes[0]).replaceWith(`<w:t xml:space="preserve">${escapeXmlText(`Step ${step.stepNumber}: ${step.description}`)}</w:t>`);
                  for (let ri = 1; ri < tNodes.length; ri++) sd(tNodes[ri]).text('');
                }
              }
              sd(stAnchor).after(p);
              stAnchor = p.get(0);
              let hasImage = false;
              if (step.imageKey) {
                const imageBuf = await downloadImage(step.imageKey);
                if (imageBuf) {
                  hasImage = true;
                  const mediaName = `dast_stepimg_${i}_${step.stepNumber}.png`;
                  templateZip.file(`word/media/${mediaName}`, imageBuf);
                  const rId = addImageRel(`media/${mediaName}`);
                  let cx = pxToEmu(800);
                  let cy = pxToEmu(600);
                  try {
                    const sharp = require('sharp');
                    const meta = await sharp(imageBuf).metadata();
                    const widthPx = meta.width || 800;
                    const heightPx = meta.height || 600;
                    const maxWidthIn = 6.2;
                    const maxHeightIn = 3.8;
                    const maxWidthPx = Math.round(maxWidthIn * pxPerInch);
                    const maxHeightPx = Math.round(maxHeightIn * pxPerInch);
                    const scaleW = widthPx > maxWidthPx ? maxWidthPx / widthPx : 1;
                    const scaleH = heightPx > maxHeightPx ? maxHeightPx / heightPx : 1;
                    const scale = Math.min(scaleW, scaleH, 1);
                    const outW = Math.max(1, Math.round(widthPx * scale));
                    const outH = Math.max(1, Math.round(heightPx * scale));
                    cx = pxToEmu(outW);
                    cy = pxToEmu(outH);
                  } catch {}
                  const imgXml = buildImageParagraph(rId, cx, cy);
                  sd(stAnchor).after(imgXml);
                  stAnchor = sd(stAnchor).next().get(0);
                }
              }
              if (step.caption && hasImage) {
                const captionXml = `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:i w:val="1"/><w:iCs w:val="1"/><w:color w:val="666666"/></w:rPr><w:t xml:space="preserve">Fig: ${escapeXmlText(String(step.caption))}</w:t></w:r></w:p>`;
                sd(stAnchor).after(captionXml);
                stAnchor = sd(stAnchor).next().get(0);
              }
            }
          }
        }
        // Recommendations: strip ** markers, bold labels, preserve numbering
        if (recLabel) {
          const recs_raw = Array.isArray(finding.recommendation) ? finding.recommendation : [];
          if (recs_raw.length > 0) {
            const recTemplate = findContentTemplate(sd, sr, recLabel);
            const recKids = sr.children().toArray();
            const recIdx = recKids.indexOf(recLabel);
            if (recIdx >= 0) {
              let recEnd = -1;
              for (let j = recIdx + 1; j < recKids.length; j++) {
                const t = sd(recKids[j]).find('w\\:t').toArray().map((n: any) => sd(n).text()).join('').trim().toLowerCase().replace(/:$/, '');
                if (knownLabels.includes(t)) { recEnd = j; break; }
              }
              if (recEnd > recIdx) {
                for (const el of recKids.slice(recIdx + 1, recEnd)) sd(el).remove();
              }
            }
            let recAnchor = recLabel;
            for (const r of recs_raw) {
              const text = stripBoldMarkers(String(r || ''));
              const p = cheerio.load(recTemplate || sd.xml(recLabel), { xmlMode: true }).root().children().first();
              const pPr = sd(p).find('w\\:pPr').first();
              const pPrXml = pPr.length ? sd.xml(pPr) : '';
              const segment = splitLabelBody(text);
              const bodyText = escapeXmlText(segment ? segment.body : text);
              const labelText = segment ? escapeXmlText(segment.label) : '';
              let newXml: string;
              if (segment && labelText) {
                newXml = `<w:p>${pPrXml}<w:r><w:rPr><w:b/><w:bCs/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${labelText} </w:t></w:r><w:r><w:rPr><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${bodyText}</w:t></w:r></w:p>`;
              } else {
                newXml = `<w:p>${pPrXml}<w:r><w:rPr><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${escapeXmlText(text)}</w:t></w:r></w:p>`;
              }
              const newP = cheerio.load(newXml, { xmlMode: true }).root().children().first();
              sd(recAnchor).after(newP);
              recAnchor = newP.get(0);
            }
          }
        }
        // References: use content template (preserves numbering)
        const refTemplate = refLabel ? findContentTemplate(sd, sr, refLabel) : null;
        if (refLabel) {
          const refs = Array.isArray(finding.references || finding.finding_references)
            ? (finding.references || finding.finding_references) : [];
          const refTemplateXml = refTemplate || undefined;
          if (refTemplateXml) {
            const cleanRefTemplateXml = refTemplateXml.replace(/<w:t[^>]*>\s*[•●]\s*<\/w:t>/g, '');
            removeBetweenLabels(sd, sr, refLabel, refs.map((r: any) => String(r || '')), cleanRefTemplateXml, { bullet: true });
          } else {
            removeBetweenLabels(sd, sr, refLabel, refs.map((r: any) => String(r || '')), undefined, { bullet: true });
          }
        }

        // Wrap finding title paragraph with bookmark (deferred: after insertion into main $)
        const tpFindingTitle = cleanTitle(finding.title, false);
        const tpFindingBmName = bookmarkNameMap.get(tpFindingTitle);
        if (!tpFindingBmName && titlePara) {
          console.warn(`[DAST TOC] No bookmark name found for TP finding "${tpFindingTitle}"`);
        }

        // Apply bookmark in sd context BEFORE serialization so it survives the round-trip
        if (tpFindingBmName && titlePara) {
          const bmId = nextBmId++;
          wrapWithBookmark(sd, titlePara, tpFindingBmName, bmId);
        }

        const sectionXml = sr.children().toArray().map((el: any) => sd.xml(el)).join('');
        $(insertTarget).before(sectionXml);

        // Verify bookmark was created (no need to re-apply - it traveled with the XML)
        if (tpFindingBmName) {
          const bmCheck = body.find(`w\\:bookmarkStart[w\\:name="${tpFindingBmName}"]`).first();
          if (bmCheck.length) {
            console.log(`[DAST TOC] Verified TP bookmark "${tpFindingTitle}" → ${tpFindingBmName}`);
          } else {
            console.warn(`[DAST TOC] TP bookmark "${tpFindingTitle}" → ${tpFindingBmName} NOT found after insertion`);
          }
        }
      }
    }

    // Insert "False Positive" heading once, then FP findings
    if (fpBodyProto && fpFindings.length > 0) {
      if (fpHeadingEl) {
        const fpBmName = bookmarkNameMap.get('False Positive') || '_false_positive';
        const pageBreakP = $('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
        $(insertTarget).before($.xml(pageBreakP));
        $(insertTarget).before($.xml(fpHeadingEl));
        const insertedFp = body.find('w\\:p').filter((_: number, el: any) => {
          return paraText($, el) === 'False Positive' && $(el).find('w\\:pStyle[w\\:val="Heading2"]').length > 0;
        }).first();
        if (insertedFp.length) {
          const fpBmId = nextBmId++;
          wrapWithBookmark($, insertedFp.get(0), fpBmName, fpBmId);
          console.log(`[DAST TOC] Inserted "False Positive" heading with bookmark → ${fpBmName} (id=${fpBmId})`);
        }
      }
      for (let i = 0; i < fpFindings.length; i++) {
        const finding = fpFindings[i];
        const sd = makeSectionDoc(fpBodyProto);
        const sr = sd('root');
        const titlePara = findTitlePara(sd, sr);
        const descLabel = sectionFindByText(sd, 'Description:');
        const urlLabel = sectionFindByText(sd, 'Affected URL:') || sectionFindByText(sd, 'Affected Target:');

        if (titlePara) {
          sectionSetText(sd, titlePara, cleanTitle(finding.title, true));
          // Apply Heading2 so finding appears as sub-entry under FP in TOC
          let fpPPr = sd(titlePara).children('w\\:pPr').first();
          if (!fpPPr.length) {
            sd(titlePara).prepend('<w:pPr/>');
            fpPPr = sd(titlePara).children('w\\:pPr').first();
          }
          if (!fpPPr.find('w\\:pStyle').length) {
            fpPPr.prepend('<w:pStyle w:val="Heading2"/>');
          }
          // Ensure FP finding titles have no extra indentation (match TP alignment)
          let fpInd = fpPPr.find('w\\:ind').first();
          if (fpInd.length) {
            fpInd.attr('w:left', '0');
            fpInd.attr('w:firstLine', '0');
          }
          // Clear any hyperlinks, tabs, or stray formatting from stale template content
          sd(titlePara).find('w\\:hyperlink').remove();
        }

        if (descLabel) {
          const desc = String(finding.description || finding.detail || '');
          removeBetweenLabels(sd, sr, descLabel, desc ? [desc] : ['No description provided.']);
        }
        if (urlLabel) {
          const urls: string[] = [];
          if (Array.isArray(finding.affected_urls)) urls.push(...finding.affected_urls.map((u: any) => String(u.url || u)));
          else if (finding.affected_url) urls.push(String(finding.affected_url));
          else if (finding.affected_target) urls.push(String(finding.affected_target));
          removeBetweenLabels(sd, sr, urlLabel, urls.length ? urls : ['N/A'], undefined, { bullet: true });
        }

        // Remove impact/likelihood/steps/recs/refs from FP
        for (const label of ['Risk:', 'Impact:', 'Likelihood:', 'Impact & Likelihood:', 'Impact and Likelihood:', 'Steps to Reproduce:', 'Recommendations:', 'References:']) {
          const el = sectionFindByText(sd, label);
          if (el) sd(el).remove();
        }

        // Handle evidence images for FP findings
        const evidenceLabel = sectionFindByText(sd, 'Evidence:');
        const evidenceItems = (finding.evidence_items || []).filter((ei: any) => ei.imageKey);
        const backPara = sectionFindByText(sd, 'Back to Summary');
        if (evidenceLabel) {
          if (evidenceItems.length > 0) {
            // Remove placeholder content between Evidence: and Back to Summary
            const secKids = sr.children().toArray();
            const evIdx = secKids.indexOf(evidenceLabel);
            if (evIdx >= 0) {
              let evEndIdx = -1;
              for (let j = evIdx + 1; j < secKids.length; j++) {
                const t = sd(secKids[j]).find('w\\:t').toArray().map((n: any) => sd(n).text()).join('').trim().toLowerCase().replace(/:$/, '');
                if (knownLabels.includes(t)) { evEndIdx = j; break; }
              }
              if (evEndIdx > evIdx) {
                const toRemove = secKids.slice(evIdx + 1, evEndIdx);
                for (const el of toRemove) sd(el).remove();
              }
            }
            const anchor = backPara || sd('root').children().last().get(0);
            for (let ei = 0; ei < evidenceItems.length; ei++) {
              const item = evidenceItems[ei];
              if (item.imageKey) {
                const imageBuf = await downloadImage(item.imageKey);
                if (imageBuf) {
                  const mediaName = `dast_evidence_${i}_${ei}.png`;
                  const mediaPath = `word/media/${mediaName}`;
                  templateZip.file(mediaPath, imageBuf);
                  const rId = addImageRel(`media/${mediaName}`);
                  let cx = pxToEmu(800);
                  let cy = pxToEmu(600);
                  try {
                    const sharp = require('sharp');
                    const meta = await sharp(imageBuf).metadata();
                    const widthPx = meta.width || 800;
                    const heightPx = meta.height || 600;
                    const maxWidthIn = 6.2;
                    const maxHeightIn = 3.8;
                    const maxWidthPx = Math.round(maxWidthIn * pxPerInch);
                    const maxHeightPx = Math.round(maxHeightIn * pxPerInch);
                    const scaleW = widthPx > maxWidthPx ? maxWidthPx / widthPx : 1;
                    const scaleH = heightPx > maxHeightPx ? maxHeightPx / heightPx : 1;
                    const scale = Math.min(scaleW, scaleH, 1);
                    const outW = Math.max(1, Math.round(widthPx * scale));
                    const outH = Math.max(1, Math.round(heightPx * scale));
                    cx = pxToEmu(outW);
                    cy = pxToEmu(outH);
                  } catch {}
                  const imgXml = buildImageParagraph(rId, cx, cy);
                  sd(anchor).before(imgXml);
                }
              }
              if (item.caption) {
                const captionXml = `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:i w:val="1"/><w:iCs w:val="1"/><w:color w:val="666666"/></w:rPr><w:t xml:space="preserve">Fig: ${escapeXmlText(String(item.caption))}</w:t></w:r></w:p>`;
                sd(anchor).before(captionXml);
              }
            }
          } else {
            // No evidence items - remove the entire Evidence section
            const secKids = sr.children().toArray();
            const evIdx = secKids.indexOf(evidenceLabel);
            if (evIdx >= 0) {
              let evEndIdx = -1;
              for (let j = evIdx + 1; j < secKids.length; j++) {
                const t = sd(secKids[j]).find('w\\:t').toArray().map((n: any) => sd(n).text()).join('').trim().toLowerCase().replace(/:$/, '');
                if (knownLabels.includes(t) || t === 'back to summary') { evEndIdx = j; break; }
              }
              if (evEndIdx > evIdx) {
                for (const el of secKids.slice(evIdx, evEndIdx)) sd(el).remove();
              } else {
                sd(evidenceLabel).remove();
              }
            } else {
              sd(evidenceLabel).remove();
            }
          }
        }

        // Wrap FP finding title paragraph with bookmark (deferred: after insertion into main $)
        const fpFindingTitle = cleanTitle(finding.title, true);
        const fpFindingBmName = bookmarkNameMap.get(fpFindingTitle);
        if (!fpFindingBmName && titlePara) {
          console.warn(`[DAST TOC] No bookmark name found for FP finding "${fpFindingTitle}"`);
        }

        if (fpFindingBmName && titlePara) {
          const bmId = nextBmId++;
          wrapWithBookmark(sd, titlePara, fpFindingBmName, bmId);
        }

        const sectionXml = sr.children().toArray().map((el: any) => sd.xml(el)).join('');
        $(insertTarget).before(sectionXml);

        if (fpFindingBmName) {
          const bmCheck = body.find(`w\\:bookmarkStart[w\\:name="${fpFindingBmName}"]`).first();
          if (bmCheck.length) {
            console.log(`[DAST TOC] Verified FP bookmark "${fpFindingTitle}" → ${fpFindingBmName}`);
          } else {
            console.warn(`[DAST TOC] FP bookmark "${fpFindingTitle}" → ${fpFindingBmName} NOT found after insertion`);
          }
        }
      }
    }
  }

  // NOTE: The template's native TOC SDT block is preserved as-is.
  // Word / Google Docs will auto-populate it when the user clicks "Update TOC".
  // We do NOT rebuild or touch the TOC entries here.

  // Write full document.xml back to zip (with green recolor applied to the
  // "key" shape and the header/footer gradient bars)
  const documentXmlFinal = recolorKeyAndGrad($.xml());
  templateZip.file('word/document.xml', Buffer.from(documentXmlFinal));
  templateZip.file(relsPath, Buffer.from($rels.xml()));
  for (const partName of ['word/header1.xml', 'word/header2.xml', 'word/header3.xml', 'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml']) {
    const partXml = await templateZip.file(partName)?.async('string');
    if (partXml && partXml.includes('accent1')) {
      templateZip.file(partName, Buffer.from(recolorKeyAndGrad(partXml)));
    }
  }

  const outBuf = await templateZip.generateAsync({ type: 'nodebuffer' });
  return outBuf;
}

export const DastRenderer: TemplateRenderer = { key, matches, generateDocxBuffer };
