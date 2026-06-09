import * as fs from 'fs';
import { format as formatDate } from 'date-fns';
import type { ReportTemplate } from '../../models/report.model';
import type { TemplateRenderer } from '../types';
import s3Service from '../../services/s3.service';

type ReportData = {
  project: any;
  findings: any[];
  template: ReportTemplate;
  metadata: { generatedDate?: string };
};

const formatBlueAllyDate = (raw: any): string | null => {
  if (!raw) return null;
  try {
    // BlueAlly template uses ordinal dates like "6th June 2025".
    return formatDate(new Date(raw), 'do MMMM yyyy');
  } catch {
    return null;
  }
};

const severityKey = (s: any): 'critical' | 'high' | 'medium' | 'low' | 'informational' => {
  const v = String(s || '').toLowerCase();
  if (v === 'critical') return 'critical';
  if (v === 'high') return 'high';
  if (v === 'medium') return 'medium';
  if (v === 'low') return 'low';
  if (v === 'informational' || v === 'info') return 'informational';
  return 'informational';
};

const extractValue = (value: any): string => {
  if (!value) return 'N/A';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (typeof value.detail === 'string' && value.detail.trim()) return value.detail;
    if (value.severity && value.detail) return `${value.severity} - ${value.detail}`;
    if (value.severity) return String(value.severity);
    try {
      return JSON.stringify(value);
    } catch {
      return 'N/A';
    }
  }
  return String(value);
};

// ── TOC helpers (mirrors DAST approach) ──
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
}
// ── end TOC helpers ──

export const BlueAllyRenderer: TemplateRenderer = {
  key: 'blueally',
  matches: (template) => {
    const key = String((template as any)?.template_data?.key || '').toLowerCase();
    if (key === 'blueally') return true;
    const name = String((template as any)?.name || '').toLowerCase();
    const docx = String((template as any)?.template_data?.docx_template_file || '').toLowerCase();
    return name.includes('blueally') || docx.includes('blueally');
  },
  generateDocxBuffer: async ({ templatePath, data }: { templatePath: string; data: ReportData }) => {
    let PizZip: any;
    let cheerio: any;
    let sharp: any;
    try {
      PizZip = require('pizzip');
      cheerio = require('cheerio');
      sharp = require('sharp');
    } catch {
      // Fall back to returning the base template as-is.
      return fs.readFileSync(templatePath);
    }

    const { project, findings } = data;

    const counts = findings.reduce(
      (acc: Record<string, number>, f: any) => {
        const k = severityKey(f?.severity);
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0, informational: 0 }
    );

    const clientName = String(project?.client_name || project?.clientName || 'N/A');
    const projectName = String(project?.name || 'N/A');
    const startDate = project?.start_date
      ? formatDate(new Date(project.start_date), 'MMMM dd, yyyy')
      : null;

    const startRange = formatBlueAllyDate(project?.start_date);
    const endRange = formatBlueAllyDate(project?.end_date);

    const domains = Array.isArray(project?.domains)
      ? project.domains.map((d: any) => String(d || '').trim()).filter(Boolean)
      : [];

    const zip = new PizZip(fs.readFileSync(templatePath, 'binary'));
    const documentPath = 'word/document.xml';
    const documentXml = zip.file(documentPath)?.asText() || '';
    const $ = cheerio.load(documentXml, { xmlMode: true });
    const body = $('w\\:body');

    const relsPath = 'word/_rels/document.xml.rels';
    const relsXml = zip.file(relsPath)?.asText() || '';
    const $rels = cheerio.load(relsXml, { xmlMode: true });

    let docPrCounter = 1;

    const removeBoldFromParagraph = ($p: any) => {
      // Word bold can be expressed as <w:b/> or <w:b w:val="1"/>.
      $p('w\\:b').remove();
    };

    // NOTE: bold styling is applied at run-level via setParagraphRuns().

    const nextRelId = (): string => {
      const ids = new Set<string>();
      $rels('Relationship').each((_: number, r: any) => {
        const id = String($rels(r).attr('Id') || '');
        if (id) ids.add(id);
      });
      let n = 1;
      while (ids.has(`rId${n}`)) n++;
      return `rId${n}`;
    };

    const addImageRelationship = (target: string): string => {
      const id = nextRelId();
      // Relationship root is <Relationships>.
      const root = $rels('Relationships').first();
      root.append(
        `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${target}"/>`
      );
      return id;
    };

    const addHyperlinkRelationship = (url: string): string => {
      const id = nextRelId();
      const root = $rels('Relationships').first();
      root.append(
        `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${url}" TargetMode="External"/>`
      );
      return id;
    };

    const emuPerInch = 914400;
    const pxPerInch = 96;
    const pxToEmu = (px: number) => Math.max(1, Math.round((px / pxPerInch) * emuPerInch));

    const buildImageParagraphXml = (rId: string, cx: number, cy: number): string => {
      // Minimal inline drawing block.
      const docPrId = docPrCounter++;
      return [
        '<w:p>',
        '  <w:pPr>',
        '    <w:jc w:val="center"/>',
        '    <w:spacing w:line="276" w:lineRule="auto"/>',
        '  </w:pPr>',
        '  <w:r>',
        '    <w:drawing>',
        `      <wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">`,
        `        <wp:extent cx="${cx}" cy="${cy}"/>`,
        `        <wp:docPr id="${docPrId}" name="Picture ${docPrId}"/>`,
        '        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">',
        '          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">',
        '            <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">',
        '              <pic:nvPicPr>',
        '                <pic:cNvPr id="0" name="image"/>',
        '                <pic:cNvPicPr/>',
        '              </pic:nvPicPr>',
        '              <pic:blipFill>',
        `                <a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>`,
        '                <a:stretch><a:fillRect/></a:stretch>',
        '              </pic:blipFill>',
        '              <pic:spPr>',
        '                <a:xfrm>',
        '                  <a:off x="0" y="0"/>',
        `                  <a:ext cx="${cx}" cy="${cy}"/>`,
        '                </a:xfrm>',
        '                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>',
        '              </pic:spPr>',
        '            </pic:pic>',
        '          </a:graphicData>',
        '        </a:graphic>',
        '      </wp:inline>',
        '    </w:drawing>',
        '  </w:r>',
        '</w:p>',
      ].join('');
    };

    const addImageFromBuffer = async (buf: Buffer): Promise<{ rId: string; cx: number; cy: number } | null> => {
      try {
        // Normalize to PNG for predictable content types.
        const img = sharp(buf);
        const meta = await img.metadata();
        const widthPx = meta.width || 1200;
        const heightPx = meta.height || 800;

        const maxWidthIn = 6.2; // keep consistent layout
        const maxHeightIn = 3.8; // avoid tall screenshots blowing up pagination
        const maxWidthPx = Math.round(maxWidthIn * pxPerInch);
        const maxHeightPx = Math.round(maxHeightIn * pxPerInch);
        const scaleW = widthPx > maxWidthPx ? maxWidthPx / widthPx : 1;
        const scaleH = heightPx > maxHeightPx ? maxHeightPx / heightPx : 1;
        const scale = Math.min(scaleW, scaleH, 1);
        const outW = Math.max(1, Math.round(widthPx * scale));
        const outH = Math.max(1, Math.round(heightPx * scale));

        const png = await img.png().toBuffer();

        const mediaIndex = (() => {
          const existing = Object.keys(zip.files || {}).filter((p) => p.startsWith('word/media/'));
          return existing.length + 1;
        })();
        const mediaName = `blueally-step-${Date.now()}-${mediaIndex}.png`;
        const mediaPath = `word/media/${mediaName}`;
        zip.file(mediaPath, png);

        const rId = addImageRelationship(`media/${mediaName}`);
        return { rId, cx: pxToEmu(outW), cy: pxToEmu(outH) };
      } catch {
        return null;
      }
    };

    const addImageFromUrl = async (url: string): Promise<{ rId: string; cx: number; cy: number } | null> => {
      try {
        // Prefer Node http/https to avoid runtime fetch quirks with signed URLs.
        const http = require('http');
        const https = require('https');
        const protocol = String(url).startsWith('https') ? https : http;
        const buf: Buffer = await new Promise((resolve, reject) => {
          protocol
            .get(url, (res: any) => {
              if (!res || (res.statusCode && res.statusCode >= 400)) {
                reject(new Error(`HTTP ${res?.statusCode || 0}`));
                return;
              }
              const chunks: Buffer[] = [];
              res.on('data', (c: Buffer) => chunks.push(c));
              res.on('end', () => resolve(Buffer.concat(chunks)));
              res.on('error', reject);
            })
            .on('error', reject);
        });
        return await addImageFromBuffer(buf);
      } catch {
        return null;
      }
    };

    const addImageFromFilePath = async (filePath: string): Promise<{ rId: string; cx: number; cy: number } | null> => {
      try {
        if (!filePath || !fs.existsSync(filePath)) return null;
        const buf = fs.readFileSync(filePath);
        return await addImageFromBuffer(buf);
      } catch {
        return null;
      }
    };

    const tryParseJsonArray = (raw: any): any[] | null => {
      if (!raw) return null;
      if (Array.isArray(raw)) return raw;
      if (typeof raw !== 'string') return null;
      const s = raw.trim();
      if (!s.startsWith('[')) return null;
      try {
        const v = JSON.parse(s);
        return Array.isArray(v) ? v : null;
      } catch {
        return null;
      }
    };

    const isProbablyImageFile = (p: string): boolean => {
      const s = String(p || '').toLowerCase();
      return /\.(png|jpe?g|webp|gif)$/.test(s);
    };

    const pickImageCandidates = (stepObj: any): { urls: string[]; keys: string[]; captions: string[] } => {
      const urls: string[] = [];
      const keys: string[] = [];
      const captions: string[] = [];
      const push = (v: any) => {
        if (typeof v !== 'string') return;
        const s = v.trim();
        if (!s) return;
        if (s.startsWith('http://') || s.startsWith('https://')) urls.push(s);
        else if (s.startsWith('findings/') || s.startsWith('temp/')) keys.push(s);
      };
      if (!stepObj || typeof stepObj !== 'object') return { urls, keys, captions };
      push(stepObj.signedUrl);
      push(stepObj.url);
      push(stepObj.imageKey);
      push(stepObj.image);
      if (typeof stepObj.caption === 'string' && stepObj.caption.trim()) captions.push(stepObj.caption.trim());

      if (Array.isArray(stepObj.images)) {
        for (const img of stepObj.images) {
          if (!img) continue;
          if (typeof img === 'string') {
            push(img);
            continue;
          }
          if (typeof img === 'object') {
            push(img.signedUrl);
            push(img.url);
            push(img.imageKey);
            push(img.key);
            push(img.image);
            if (typeof img.caption === 'string' && img.caption.trim()) captions.push(img.caption.trim());
          }
        }
      }
      return { urls: Array.from(new Set(urls)), keys: Array.from(new Set(keys)), captions: Array.from(new Set(captions)) };
    };

    const setParagraphRuns = (pNode: any, runs: Array<{ text: string; bold?: boolean }>): any => {
      const $p = cheerio.load($.xml(pNode), { xmlMode: true });
      // Remove all existing runs.
      $p('w\\:r').remove();
      // Preserve paragraph properties by appending runs after pPr.
      const pEl = $p('w\\:p').first();
      const pPr = pEl.children('w\\:pPr').first();

      // Some template paragraphs set bold at the paragraph-level via pPr/rPr.
      // We always control bold per-run in this renderer.
      pPr.find('w\\:rPr').remove();

      const insertAfter = pPr.length ? pPr : null;
      const mkRun = (text: string, bold?: boolean) => {
        const safe = String(text ?? '');
        const b = bold ? '<w:rPr><w:b/></w:rPr>' : '';
        return `<w:r>${b}<w:t xml:space="preserve">${safe
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
        }</w:t></w:r>`;
      };
      const xml = runs.map((r) => mkRun(r.text, r.bold)).join('');
      if (insertAfter) {
        (insertAfter as any).after(xml);
      } else {
        pEl.prepend(xml);
      }
      return $p.root().children().first();
    };

    const tightenParagraphSpacing = (pNode: any, opts?: { before?: number; after?: number; line?: number }) => {
      const el = (pNode && typeof pNode === 'object' && 'length' in pNode && (pNode as any)[0]) ? (pNode as any)[0] : pNode;
      let pPr = $(el).children('w\\:pPr').first();
      if (!pPr.length) {
        $(el).prepend('<w:pPr/>');
        pPr = $(el).children('w\\:pPr').first();
      }
      let spacing = pPr.children('w\\:spacing').first();
      if (!spacing.length) {
        pPr.append('<w:spacing/>');
        spacing = pPr.children('w\\:spacing').first();
      }
      if (typeof opts?.before === 'number') spacing.attr('w:before', String(opts.before));
      if (typeof opts?.after === 'number') spacing.attr('w:after', String(opts.after));
      if (typeof opts?.line === 'number') {
        spacing.attr('w:line', String(opts.line));
        spacing.attr('w:lineRule', 'auto');
      }
      return el;
    };

    const stripHighlights = (scope: any) => {
      // The BlueAlly base template contains yellow highlights used as visual cues.
      // Generated reports should not carry those highlights.
      const root = scope ? $(scope) : $.root();
      root.find('w\\:highlight').remove();
      // Some highlights can be expressed as shading fills.
      root.find('w\\:shd[w\\:fill="ffff00"], w\\:shd[w\\:fill="FFFF00"]').remove();
    };

    const replaceClientTokens = () => {
      // Replace all occurrences of the sample client name "PubNub" with the actual client name.
      // This applies across the whole document.
      $('w\\:t').each((_: number, t: any) => {
        const v = String($(t).text() || '');
        if (!v) return;
        // Replace possessive and plain forms.
        let next = v
          .replace(/\bpubnub's\b/gi, `${clientName}'s`)
          .replace(/\bpubnub\b/gi, clientName);
        if (next !== v) $(t).text(next);
      });
    };

    const paraText = (pEl: any): string => {
      const parts: string[] = [];
      $(pEl)
        .find('w\\:t')
        .each((_: number, t: any) => {
          const v = $(t).text();
          if (v) parts.push(v);
        });
      return parts.join('').replace(/\s+/g, ' ').trim();
    };

    // ── Initialize bookmark ID counter and TOC tracking (DAST-style) ──
    let maxBmId = -1;
    body.find('w\\:bookmarkStart, w\\:bookmarkEnd').each((_: number, el: any) => {
      const id = parseInt(String($(el).attr('w:id') || '-1'), 10);
      if (id > maxBmId) maxBmId = id;
    });
    let nextBmId = maxBmId + 1;
    const bookmarkNameMap = new Map<string, string>();
    const tocEntries: Array<{ title: string; level: 0 | 1 }> = [];

    // Wrap all static Heading1 paragraphs with bookmarks (except TOC heading itself).
    {
      const allParas = $('w\\:p').toArray();
      const isH1 = (p: any) => $(p).find('w\\:pPr > w\\:pStyle').attr('w:val') === 'Heading1';
      for (const p of allParas) {
        if (!isH1(p)) continue;
        const t = paraText(p);
        if (!t || /^Table of Contents$/i.test(t)) continue;
        const bmName = slugifyBookmark(t);
        wrapWithBookmark($, p, bmName, nextBmId++);
        bookmarkNameMap.set(t, bmName);
        tocEntries.push({ title: t, level: 0 });
      }
    }

    // Ensure Executive Summary starts on a new page (after TOC).
    {
      const allParas = $('w\\:p').toArray();
      const isH1 = (p: any) => $(p).find('w\\:pPr > w\\:pStyle').attr('w:val') === 'Heading1';
      for (const p of allParas) {
        if (!isH1(p)) continue;
        const t = paraText(p);
        if (!t || !/^Executive Summary$/i.test(t)) continue;
        let pPr = $(p).children('w\\:pPr').first();
        if (!pPr.length) {
          $(p).prepend('<w:pPr/>');
          pPr = $(p).children('w\\:pPr').first();
        }
        if (!pPr.children('w\\:pageBreakBefore').length) {
          pPr.prepend('<w:pageBreakBefore/>');
        }
        break;
      }
    }

    // 0) Strip template highlights globally.
    stripHighlights(null);

    // Replace all PubNub mentions with client name.
    replaceClientTokens();

    // 1) Cover page dynamic values + remove remediation test line.
    // Cover content is often placed in text boxes; operate on text runs rather than whole paragraphs.
    $('w\\:t').each((_: number, t: any) => {
      const v = String($(t).text() || '');
      if (!v) return;
      if (v.trim() === 'Vulnerability Assessment and Penetration Test Report') {
        $(t).text(projectName);
      }
      if (/^Prepared\s+for\s*:/i.test(v.trim())) {
        $(t).text(`Prepared for: ${clientName}`);
      }
      if (/^Original\s+Test\s*:/i.test(v.trim()) && startDate) {
        $(t).text(`Original Test: ${startDate}`);
      }
    });

    // Some base templates split the report title across runs, e.g. "Application " + "Vulnerability Assessment...".
    // After replacement, that can surface as "Application <ProjectName>". Strip the prefix on the cover only.
    $('w\\:p').each((_: number, p: any) => {
      const ts = $(p).find('w\\:t').toArray();
      if (!ts.length) return;

      const texts = ts.map((t: any) => String($(t).text() || ''));
      const joined = texts.join('');
      const looksLikeCoverTitle = joined.includes(projectName) && (joined.toLowerCase().includes('application') || joined.toLowerCase().includes('vulnerability assessment'));
      if (!looksLikeCoverTitle) return;

      // Only touch very short "Application" prefix runs.
      for (let i = 0; i < ts.length; i++) {
        const raw = String($(ts[i]).text() || '');
        if (raw === 'Application ' || raw.trim() === 'Application') {
          $(ts[i]).text('');
        }
      }
    });

    // Some cover layouts keep the client name in a separate run right after the "Prepared for" run.
    // Remove that duplicate run (keep only "Prepared for: <client>").
    $('w\\:p').each((_: number, p: any) => {
      const texts = $(p).find('w\\:t').toArray().map((t: any) => String($(t).text() || ''));
      const hasPrepared = texts.some((v: string) => /^\s*Prepared\s+for\s*:/i.test(v.trim()));
      if (!hasPrepared) return;
      $(p)
        .find('w\\:t')
        .each((__: number, t: any) => {
          const v = String($(t).text() || '');
          if (v.trim() === clientName && !/^\s*Prepared\s+for\s*:/i.test(v.trim())) {
            $(t).text('');
          }
        });
    });

    // Remove the remediation test line entirely (must never appear in generated BlueAlly reports).
    $('w\\:p').each((_: number, p: any) => {
      const txt = paraText(p);
      if (/^Remediation\s+Test\s*:/i.test(txt)) {
        $(p).remove();
      }
    });

    // Executive summary duration dates.
    if (startRange && endRange) {
      $('w\\:p').each((_: number, p: any) => {
        const txt = paraText(p);
        if (!txt) return;
        if (!/duration of the pen test ran from/i.test(txt)) return;
        const next = txt.replace(/duration of the pen test ran from\s+.*?\./i, `duration of the pen test ran from ${startRange} to ${endRange}.`);
        if (next !== txt) {
          $(p).find('w\\:t').each((__: number, t: any) => $(t).text(''));
          const first = $(p).find('w\\:t').first();
          if (first.length) first.text(next);
          stripHighlights(p);
        }
      });
    }

    // Scope page assessment window dates.
    if (startRange && endRange) {
      $('w\\:p').each((_: number, p: any) => {
        const txt = paraText(p);
        if (!txt) return;
        if (!/^The assessment was conducted between/i.test(txt)) return;
        const next = `The assessment was conducted between ${startRange} and ${endRange}. Testing was performed remotely.`;
        $(p).find('w\\:t').each((__: number, t: any) => $(t).text(''));
        const first = $(p).find('w\\:t').first();
        if (first.length) first.text(next);
        stripHighlights(p);
      });
    }

    // 2) Executive summary severity counts.
    $('w\\:t').each((_: number, t: any) => {
      const v = String($(t).text() || '').trim();
      const m = v.match(/^(Critical|High|Medium|Low)\s*:\s*\d+$/i);
      if (!m) return;
      const label = m[1].toLowerCase();
      const k = label === 'critical' ? 'critical'
        : label === 'high' ? 'high'
          : label === 'medium' ? 'medium'
            : 'low';
      $(t).text(`${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()}: ${counts[k] || 0}`);
    });
    // Medium sometimes appears without a space after colon in the template.
    $('w\\:t').each((_: number, t: any) => {
      const v = String($(t).text() || '').trim();
      if (/^Medium:\d+$/i.test(v)) {
        $(t).text(`Medium: ${counts.medium || 0}`);
      }
    });

    // Insert Informational count line right after the Low line, in the exec summary list.
    {
      let inserted = false;
      const ps = $('w\\:p').toArray();
      for (const p of ps) {
        const txt = paraText(p);
        if (!/^Low\s*:\s*\d+$/i.test(txt)) continue;
        // Heuristic: only insert when this Low line is part of the short severity list.
        // In the base template this list is directly under "Vulnerabilities identified were categorized as follows".
        let ok = false;
        let cursor = $(p).prev();
        for (let i = 0; i < 6 && cursor && cursor.length; i++) {
          if (cursor[0].tagName === 'w:p') {
            const pt = paraText(cursor);
            if (pt.toLowerCase().includes('categorized as follows')) { ok = true; break; }
          }
          cursor = cursor.prev();
        }
        if (!ok) continue;

        const cloneXml = $.xml(p);
        const $c = cheerio.load(cloneXml, { xmlMode: true });
        // Replace the text node content.
        $c('w\\:t').each((__: number, tt: any) => {
          if (/^Low\s*:\s*\d+$/i.test(String($c(tt).text() || '').trim())) {
            $c(tt).text(`Informational: ${counts.informational || 0}`);
          }
        });
        $(p).after($c.root().children().first());
        inserted = true;
        break;
      }
      if (!inserted) {
        // Best-effort: also patch any existing informational count line if template already has it.
        $('w\\:t').each((_: number, t: any) => {
          const v = String($(t).text() || '').trim();
          if (/^Informational\s*:\s*\d+$/i.test(v)) {
            $(t).text(`Informational: ${counts.informational || 0}`);
          }
        });
      }
    }

    // 3) Scope domains table.
    if (domains.length) {
      const tables = $('w\\:tbl').toArray();
      for (const tbl of tables) {
        const tblText = $(tbl).find('w\\:t').toArray().map((t: any) => $(t).text()).join(' ');
        if (!/\bDomain\b/.test(tblText)) continue;

        let headerRow = $(tbl).find('w\\:tr').first();
        if (!headerRow.length) continue;

        // Ensure the header row is shaded dark blue with white bold text.
        {
          const headerXml = $.xml(headerRow.get(0));
          const $hrow = cheerio.load(headerXml, { xmlMode: true });
          $hrow('w\\:tc').each((_: number, tc: any) => {
            let tcPr = $hrow(tc).children('w\\:tcPr').first();
            if (!tcPr.length) { $hrow(tc).prepend('<w:tcPr/>'); tcPr = $hrow(tc).children('w\\:tcPr').first(); }
            let shd = tcPr.children('w\\:shd').first();
            if (!shd.length) {
              tcPr.append('<w:shd w:val="clear" w:color="auto" w:fill="002060"/>');
            } else {
              shd.attr('w:val', 'clear');
              shd.attr('w:color', 'auto');
              shd.attr('w:fill', '002060');
            }
            $hrow(tc)
              .find('w\\:r')
              .each((__: number, r: any) => {
                let rPr = $hrow(r).children('w\\:rPr').first();
                if (!rPr.length) { $hrow(r).prepend('<w:rPr/>'); rPr = $hrow(r).children('w\\:rPr').first(); }
                if (!rPr.children('w\\:b').length) rPr.append('<w:b w:val="1"/>');
                let color = rPr.children('w\\:color').first();
                if (!color.length) rPr.append('<w:color w:val="FFFFFF"/>');
                else color.attr('w:val', 'FFFFFF');
              });
          });
          headerRow.replaceWith($hrow.root().children().first());
          headerRow = $(tbl).find('w\\:tr').first();
        }

        // Remove existing data rows (keep header only).
        $(tbl).find('w\\:tr').toArray().slice(1).forEach((r: any) => $(r).remove());

        // Add a single body row with multiple hyperlink paragraphs.
        {
          const headerXml = $.xml(headerRow.get(0));
          const $r = cheerio.load(headerXml, { xmlMode: true });

          // Body row is not a repeating header.
          $r('w\\:tblHeader').remove();

          // Remove any cell shading.
          $r('w\\:tcPr').each((_: number, tcPr: any) => {
            $r(tcPr).children('w\\:shd').remove();
          });

          // Replace all cell paragraphs with our domain list.
          $r('w\\:tc').each((_: number, tc: any) => {
            // Keep tcPr, drop everything else.
            const tcPr = $r(tc).children('w\\:tcPr').first();
            $r(tc).children().each((__: number, child: any) => {
              if (child.tagName !== 'w:tcPr') $r(child).remove();
            });

            const mkPara = (inner: string) =>
              `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr>${inner}</w:p>`;

            const paras: string[] = [];
            for (const d of domains) {
              const url = String(d || '').trim();
              if (!url) continue;
              const rid = addHyperlinkRelationship(url);
              const safeText = url.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
               paras.push(
                 mkPara(
                   // Use an explicit run style + color + underline so LibreOffice reliably
                   // renders the link as blue and underlined in PDF output.
                   `<w:hyperlink r:id="${rid}"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/><w:color w:val="1155CC"/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">${safeText}</w:t></w:r></w:hyperlink>`
                 )
               );
            }

            // If there are no domains, keep an empty paragraph.
            const bodyXml = paras.length ? paras.join('') : mkPara('<w:r/>');
            if (tcPr.length) tcPr.after(bodyXml);
            else $r(tc).append(bodyXml);
          });

          // Slightly taller body row.
          if (!$r('w\\:trPr').length) $r('w\\:tr').prepend('<w:trPr/>');
          const trPr = $r('w\\:trPr').first();
          trPr.find('w\\:trHeight').remove();
          trPr.append('<w:trHeight w:val="400" w:hRule="atLeast"/>');

          headerRow.after($r.root().children().first());
        }

        // Reduce excessive vertical spacing in the domain table rows.
        // The base template's row height is large; keep it compact for variable domain lists.
        $(tbl)
          .find('w\\:trHeight')
          .each((_: number, h: any) => {
            $(h).attr('w:val', '120'); // tighter rows
            $(h).attr('w:hRule', 'atLeast');
          });

        // Keep outer border and a separator line between header/body.
        {
          let tblPr = $(tbl).children('w\\:tblPr').first();
          if (!tblPr.length) {
            $(tbl).prepend('<w:tblPr/>');
            tblPr = $(tbl).children('w\\:tblPr').first();
          }
          let borders = tblPr.children('w\\:tblBorders').first();
          if (!borders.length) {
            tblPr.append('<w:tblBorders/>' );
            borders = tblPr.children('w\\:tblBorders').first();
          }
          // Ensure outside borders exist (leave whatever style the template used if present).
          const ensureSide = (tag: string) => {
            if (!borders.children(`w\\:${tag}`).length) {
              borders.append(`<w:${tag} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`);
            }
          };
          ensureSide('top');
          ensureSide('left');
          ensureSide('bottom');
          ensureSide('right');

          // Horizontal separator line between header and body.
          borders.children('w\\:insideH').remove();
          borders.append('<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>');

          // No vertical separators (single column).
          borders.children('w\\:insideV').remove();
          borders.append('<w:insideV w:val="nil"/>');

          // Tighten paragraph spacing inside the table cells.
          $(tbl).find('w\\:tc w\\:p').each((_: number, p: any) => {
            let pPr = $(p).children('w\\:pPr').first();
            if (!pPr.length) { $(p).prepend('<w:pPr/>'); pPr = $(p).children('w\\:pPr').first(); }
            let spacing = pPr.children('w\\:spacing').first();
            if (!spacing.length) { pPr.append('<w:spacing/>'); spacing = pPr.children('w\\:spacing').first(); }
            spacing.attr('w:before', '0');
            spacing.attr('w:after', '0');
            spacing.attr('w:line', '240');
            spacing.attr('w:lineRule', 'auto');
          });
        }
        break;
      }
    }

    // 3.A) Ensure all table header rows stay dark blue in PDF.
    // LibreOffice can drop style-based shading and render headers as gray.
    {
      const headerFill = '002060';
      $('w\\:tbl').each((_: number, tbl: any) => {
        const headerRow = $(tbl).find('w\\:tr').toArray().find((tr: any) => $(tr).find('w\\:tblHeader[w\\:val="1"], w\\:tblHeader').length > 0);
        if (!headerRow) return;

        const rowXml = $.xml(headerRow);
        const $hr = cheerio.load(rowXml, { xmlMode: true });
        $hr('w\\:tc').each((__: number, tc: any) => {
          let tcPr = $hr(tc).children('w\\:tcPr').first();
          if (!tcPr.length) { $hr(tc).prepend('<w:tcPr/>'); tcPr = $hr(tc).children('w\\:tcPr').first(); }
          let shd = tcPr.children('w\\:shd').first();
          if (!shd.length) tcPr.append(`<w:shd w:val="clear" w:color="auto" w:fill="${headerFill}"/>`);
          else { shd.attr('w:val', 'clear'); shd.attr('w:color', 'auto'); shd.attr('w:fill', headerFill); }

          // White text in header row.
          $hr(tc).find('w\\:r').each((___: number, r: any) => {
            let rPr = $hr(r).children('w\\:rPr').first();
            if (!rPr.length) { $hr(r).prepend('<w:rPr/>'); rPr = $hr(r).children('w\\:rPr').first(); }
            let color = rPr.children('w\\:color').first();
            if (!color.length) rPr.append('<w:color w:val="FFFFFF"/>');
            else color.attr('w:val', 'FFFFFF');
          });
        });
        $(headerRow).replaceWith($hr.root().children().first());
      });
    }

    // 3.1) Web Application Findings table: use selected findings, remove Status column.
    {
      const severityFill = (sev: any): string => {
        const k = severityKey(sev);
        if (k === 'critical') return '980000';
        if (k === 'high') return 'cc0000';
        if (k === 'medium') return 'ff9900';
        if (k === 'low') return '6aa84f';
        return '4a86e8';
      };

      const tables = $('w\\:tbl').toArray();
      for (const tbl of tables) {
        const headerText = $(tbl).find('w\\:tr').first().find('w\\:t').toArray().map((t: any) => $(t).text().trim()).filter(Boolean).join('|');
        if (!/Vulnerability\|Risk\|Status/i.test(headerText)) continue;

        const rows = $(tbl).find('w\\:tr').toArray();
        if (rows.length < 2) break;

        const header = rows[0];
        const dataTpl = rows[1];

        // Remove Status column from header + template.
        const removeThirdCol = (trNode: any) => {
          const tcs = $(trNode).find('w\\:tc').toArray();
          if (tcs.length >= 3) $(tcs[2]).remove();
        };
        removeThirdCol(header);
        removeThirdCol(dataTpl);

        // Remove 3rd grid col so table width recalculates.
        const gridCols = $(tbl).find('w\\:tblGrid > w\\:gridCol').toArray();
        if (gridCols.length >= 3) $(gridCols[2]).remove();

        // Remove existing data rows.
        rows.slice(1).forEach((r: any) => $(r).remove());

        const sorted = [...(Array.isArray(findings) ? findings : [])].sort((a: any, b: any) => {
          const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, informational: 4 };
          const da = order[severityKey(a?.severity)] ?? 99;
          const db = order[severityKey(b?.severity)] ?? 99;
          if (da !== db) return da - db;
          return String(a?.title || '').localeCompare(String(b?.title || ''));
        });

        for (const f of sorted) {
          const rowXml = $.xml(dataTpl);
          const $r = cheerio.load(rowXml, { xmlMode: true });
          const tNodes = $r('w\\:t').toArray();
          if (tNodes.length >= 1) $r(tNodes[0]).text(String(f?.title || 'N/A'));
          if (tNodes.length >= 2) $r(tNodes[1]).text(String(f?.severity || 'Informational'));

          // Shade risk cell based on severity.
          const tcs = $r('w\\:tc').toArray();
          if (tcs.length >= 2) {
            const riskTc = tcs[1];
            let tcPr = $r(riskTc).children('w\\:tcPr').first();
            if (!tcPr.length) { $r(riskTc).prepend('<w:tcPr/>'); tcPr = $r(riskTc).children('w\\:tcPr').first(); }
            let shd = tcPr.children('w\\:shd').first();
            if (!shd.length) { tcPr.append('<w:shd w:val="clear" w:fill="ffffff"/>'); shd = tcPr.children('w\\:shd').first(); }
            shd.attr('w:fill', severityFill(f?.severity));
          }
          $r('w\\:highlight').remove();
          $r('w\\:shd[w\\:fill="ffff00"], w\\:shd[w\\:fill="FFFF00"]').remove();

          $(header).after($r.root().children().first());
        }
        break;
      }
    }

    // 4) Detailed Vulnerabilities section: replace sample findings with the selected findings.
    {
      const allParas = $('w\\:p').toArray();
      const isHeading1 = (p: any) => {
        const style = $(p).find('w\\:pPr > w\\:pStyle').attr('w:val');
        return style === 'Heading1';
      };
      const isHeading2 = (p: any) => {
        const style = $(p).find('w\\:pPr > w\\:pStyle').attr('w:val');
        return style === 'Heading2';
      };

      const detailedHeading = allParas.find((p: any) => {
        if (!isHeading1(p)) return false;
        const t = paraText(p);
        return t && t.toLowerCase().includes('detailed vulnerabilities');
      });
      if (detailedHeading) {
        // Identify the first sample finding block and use its paragraphs as templates.
        let firstFindingHeading: any = null;
        let cursor = $(detailedHeading).next();
        while (cursor && cursor.length) {
          if (cursor[0].tagName === 'w:p' && isHeading2(cursor)) { firstFindingHeading = cursor; break; }
          cursor = cursor.next();
        }

        // Determine section end: next Heading1 after detailed heading.
        let endNode: any = null;
        cursor = $(detailedHeading).next();
        while (cursor && cursor.length) {
          if (cursor[0].tagName === 'w:p' && isHeading1(cursor)) { endNode = cursor; break; }
          cursor = cursor.next();
        }

        const cloneNodeXml = (node: any) => cheerio.load($.xml(node), { xmlMode: true }).root().children().first();

    const clearAndSetParagraphText = (pNode: any, text: string) => {
      const $p = cheerio.load($.xml(pNode), { xmlMode: true });
      $p('w\\:t').each((_: number, t: any) => $p(t).text(''));
      const first = $p('w\\:t').first();
      if (first.length) first.text(text);
      // Ensure we don't carry template highlights.
      $p('w\\:highlight').remove();
      $p('w\\:shd[w\\:fill="ffff00"], w\\:shd[w\\:fill="FFFF00"]').remove();
      return $p.root().children().first();
    };

        const severityColor = (sev: any): string => {
          const k = severityKey(sev);
          if (k === 'critical') return '980000';
          if (k === 'high') return 'cc0000';
          if (k === 'medium') return 'ff9900';
          if (k === 'low') return '6aa84f';
          return '4a86e8';
        };

        const patchRiskParagraph = (pNode: any, sev: string) => {
          const $p = cheerio.load($.xml(pNode), { xmlMode: true });
          const ts = $p('w\\:t').toArray();
          if (ts.length >= 1) $p(ts[0]).text('Risk: ');
          if (ts.length >= 2) $p(ts[1]).text(sev);
          // Set color of the second run (severity)
          $p('w\\:r').each((i: number, r: any) => {
            if (i !== 1) return;
            let c = $p(r).find('w\\:color').first();
            if (!c.length) {
              // create color in rPr if missing
              let rPr = $p(r).children('w\\:rPr').first();
              if (!rPr.length) { $p(r).prepend('<w:rPr/>'); rPr = $p(r).children('w\\:rPr').first(); }
              rPr.append('<w:color w:val="000000"/>');
              c = rPr.children('w\\:color').first();
            }
            c.attr('w:val', severityColor(sev));
          });
          $p('w\\:highlight').remove();
          $p('w\\:shd[w\\:fill="ffff00"], w\\:shd[w\\:fill="FFFF00"]').remove();
          return $p.root().children().first();
        };

        // Build template paragraph references from the sample block.
        let tplHeading2: any = firstFindingHeading;
        let tplRisk: any = tplHeading2 ? tplHeading2.next('w\\:p') : null;
        // Find known label paragraphs by scanning forward until next Heading2.
        const findTplByExactText = (from: any, needle: string): any => {
          // Start searching after `from` (which is usually the finding heading).
          let c = from ? from.next() : null;
          while (c && c.length) {
            if (c[0].tagName === 'w:p') {
              const t = paraText(c);
              if (t === needle) return c;
              if (isHeading2(c)) return null;
            }
            c = c.next();
          }
          return null;
        };
        const tplDescLabel = tplHeading2 ? findTplByExactText(tplHeading2, 'Description:') : null;
        const tplDescText = tplDescLabel ? tplDescLabel.next('w\\:p') : null;
        const tplAffectedUrl = tplHeading2 ? (() => {
          let c = tplHeading2.next();
          while (c && c.length) {
            if (c[0].tagName === 'w:p') {
              const t = paraText(c);
              if (t.toLowerCase().startsWith('affected url:')) return c;
              if (isHeading2(c)) return null;
            }
            c = c.next();
          }
          return null;
        })() : null;
        const tplStepsLabel = tplHeading2 ? findTplByExactText(tplHeading2, 'Steps to reproduce:') : null;
        const tplStepText = tplStepsLabel ? tplStepsLabel.next('w\\:p') : null;
        const tplImpactLabel = tplHeading2 ? findTplByExactText(tplHeading2, 'Impact and Likelihood:') : null;
        const tplImpactText = tplImpactLabel ? tplImpactLabel.next('w\\:p') : null;
        const tplRecsLabel = tplHeading2 ? findTplByExactText(tplHeading2, 'Recommendations:') : null;
        const tplRecText = tplRecsLabel ? tplRecsLabel.next('w\\:p') : null;
        const tplRefLabel = tplHeading2 ? findTplByExactText(tplHeading2, 'Reference:') : null;
        const tplRefText = tplRefLabel ? tplRefLabel.next('w\\:p') : null;
        const tplBack = tplHeading2 ? findTplByExactText(tplHeading2, 'Back to Summary') : null;
        // Remove all nodes between heading and endNode (exclusive).
        cursor = $(detailedHeading).next();
        while (cursor && cursor.length && (!endNode || cursor[0] !== endNode[0])) {
          const next = cursor.next();
          cursor.remove();
          cursor = next;
        }

        const asEl = (v: any) => (v && typeof v === 'object' && 'length' in v && v[0] ? v[0] : v);
        const insertAfter = (anchorEl: any, node: any) => {
          const anchor = asEl(anchorEl);
          const xml = typeof node === 'string' ? node : $.xml(asEl(node));
          // `node` may be created by a different cheerio instance; insert by XML string
          // and return the actual inserted sibling element from the main document.
          $(anchor).after(xml);
          // Use nextAll() to skip over whitespace text nodes.
          return $(anchor).nextAll().first().get(0);
        };

        let anchor: any = detailedHeading;
        const safeFindings = Array.isArray(findings) ? findings : [];
        for (let idx = 0; idx < safeFindings.length; idx++) {
          const f: any = safeFindings[idx];
          const title = String(f?.title || `Finding ${idx + 1}`);
          const sev = String(f?.severity || 'Informational');

          if (tplHeading2 && tplHeading2.length) {
            const headingNode = insertAfter(anchor, clearAndSetParagraphText(tplHeading2, `7.${idx + 1}. ${title}`));
            anchor = headingNode;
            const headingTitle = `7.${idx + 1}. ${title}`;
            const fBmName = slugifyBookmark(headingTitle);
            wrapWithBookmark($, headingNode, fBmName, nextBmId++);
            bookmarkNameMap.set(headingTitle, fBmName);
            tocEntries.push({ title: headingTitle, level: 1 });
          }
          if (tplRisk && (tplRisk as any).length) {
            anchor = insertAfter(anchor, patchRiskParagraph(tplRisk, sev));
          }
          // Insert blank line after Risk (matches template spacing).
          if (tplRisk && (tplRisk as any).length) {
            const blankAfterRisk = clearAndSetParagraphText(tplRisk, '');
            anchor = insertAfter(anchor, blankAfterRisk);
          }

          if (tplDescLabel && (tplDescLabel as any).length) {
            anchor = insertAfter(anchor, cloneNodeXml(tplDescLabel));
          }
          const desc = String(f?.description || '').trim();
          const descParts = desc ? desc.split(/\n+/).map((s) => s.trim()).filter(Boolean) : ['No description provided.'];
          descParts.forEach((part) => {
              if (tplDescText && (tplDescText as any).length) {
                anchor = insertAfter(anchor, clearAndSetParagraphText(tplDescText, part));
              }
            });

          // Insert blank line before Affected URL (matches template spacing).
          // Template blank line has ind left=0 firstLine=0, no right, no spacing.
          if (tplDescText && (tplDescText as any).length) {
            const blankBeforeUrl = clearAndSetParagraphText(tplDescText, '');
            const $bUrl = cheerio.load($.xml(blankBeforeUrl), { xmlMode: true });
            $bUrl('w\\:pPr > w\\:ind').remove();
            $bUrl('w\\:pPr').first().append('<w:ind w:left="0" w:firstLine="0"/>');
            $bUrl('w\\:pPr > w\\:spacing').remove();
            anchor = insertAfter(anchor, $bUrl.root().children().first());
          }
          if (tplAffectedUrl && (tplAffectedUrl as any).length) {
            const url = String(f?.affected_target || 'N/A').trim();
            const pNode = clearAndSetParagraphText(tplAffectedUrl, '');
            const out = setParagraphRuns(pNode, [
              { text: 'Affected URL:', bold: true },
              { text: ` ${url || 'N/A'}`, bold: false },
            ]);
            anchor = insertAfter(anchor, out);
          }

          // Insert blank line before Steps to reproduce (matches template spacing).
          // Template blank line has ind left=0 right=288 firstLine=0, sp after=120.
          if (tplStepsLabel && (tplStepsLabel as any).length) {
            const blankBeforeSteps = clearAndSetParagraphText(tplStepsLabel, '');
            const $bSteps = cheerio.load($.xml(blankBeforeSteps), { xmlMode: true });
            $bSteps('w\\:pPr > w\\:ind').remove();
            $bSteps('w\\:pPr').first().append('<w:ind w:left="0" w:right="288" w:firstLine="0"/>');
            anchor = insertAfter(anchor, $bSteps.root().children().first());
          }
          if (tplStepsLabel && (tplStepsLabel as any).length) {
            anchor = insertAfter(anchor, cloneNodeXml(tplStepsLabel));
          }
          const stepsRaw = f?.steps_to_reproduce;
          const stepsArr = tryParseJsonArray(stepsRaw) || (Array.isArray(stepsRaw) ? stepsRaw : null);
          const steps = Array.isArray(stepsArr)
            ? stepsArr
            : typeof stepsRaw === 'string'
              ? stepsRaw.split(/\n+/)
              : [];
          const stepLines = (steps || [])
            .map((s: any) => typeof s === 'string' ? s : (s && typeof s === 'object' ? String(s.description || '') : String(s || '')))
            .map((s: string) => s.trim())
            .filter(Boolean);
           if (stepLines.length) {
            for (let si = 0; si < stepLines.length; si++) {
              const line = stepLines[si];
              if (tplStepText && (tplStepText as any).length) {
                const pNode = clearAndSetParagraphText(tplStepText, '');
                const out = setParagraphRuns(pNode, [
                  { text: `Step ${si + 1}:`, bold: true },
                  { text: ` ${line}`, bold: false },
                ]);
                anchor = insertAfter(anchor, out);

                // Embed step screenshot if present.
                const stepObj = Array.isArray(stepsArr) ? (stepsArr as any[])[si] : null;
                const candidates = pickImageCandidates(stepObj);
                let embedded = false;

                // 1) Try direct URLs first.
                for (const u of candidates.urls) {
                  const img = await addImageFromUrl(u);
                  if (!img) continue;
                  const imgParaXml = buildImageParagraphXml(img.rId, img.cx, img.cy);
                  const $imgP = cheerio.load(imgParaXml, { xmlMode: true });
                  anchor = insertAfter(anchor, tightenParagraphSpacing($imgP.root().children().first(), { line: 276 }));
                  embedded = true;
                  break;
                }

                // 2) Try S3 keys.
                if (!embedded) {
                  for (const k of candidates.keys) {
                    try {
                      const signed = await s3Service.getSignedUrl(k, 3600);
                      const img = await addImageFromUrl(signed);
                      if (!img) continue;
                      const imgParaXml = buildImageParagraphXml(img.rId, img.cx, img.cy);
                      const $imgP = cheerio.load(imgParaXml, { xmlMode: true });
                      anchor = insertAfter(anchor, tightenParagraphSpacing($imgP.root().children().first(), { line: 276 }));
                      embedded = true;
                      break;
                    } catch {
                      // keep trying
                    }
                  }
                }

                if (embedded) {
                  const caption = candidates.captions[0] || '';
                  if (caption) {
                    const capNode = clearAndSetParagraphText(tplStepText, '');
                    const capOut = setParagraphRuns(capNode, [{ text: `Fig ${si + 1}: ${caption}`, bold: false }]);
                    const capEl = insertAfter(anchor, tightenParagraphSpacing(capOut, { line: 276 }));
                    // Match template fig captions: line=276, jc=center, no indentation, no after spacing.
                    $(capEl).find('w\\:pPr > w\\:spacing').removeAttr('w:after');
                    $(capEl).find('w\\:pPr > w\\:ind').remove();
                    // caption style
                    $(capEl).find('w\\:pPr').each((_: number, pPr: any) => {
                      let jc = $(pPr).children('w\\:jc').first();
                      if (!jc.length) { $(pPr).append('<w:jc w:val="center"/>'); }
                      else { jc.attr('w:val', 'center'); }
                    });
                    $(capEl).find('w\\:r').each((_: number, r: any) => {
                      let rPr = $(r).children('w\\:rPr').first();
                      if (!rPr.length) { $(r).prepend('<w:rPr/>'); rPr = $(r).children('w\\:rPr').first(); }
                      if (!rPr.children('w\\:i').length) rPr.append('<w:i w:val="1"/><w:iCs w:val="1"/>');
                      let c = rPr.children('w\\:color').first();
                      if (!c.length) rPr.append('<w:color w:val="9CA3AF"/>');
                      else c.attr('w:val', '9CA3AF');
                    });
                    anchor = capEl;
                  }
                }

                // Fallback: render evidence screenshots if steps don't carry image keys.
                if (!embedded) {
                  const ev = Array.isArray((f as any)?.evidence) ? (f as any).evidence : [];
                  let figNo = 1;
                  for (const e of ev) {
                    const ft = String(e?.file_type || '').toLowerCase();
                    const fp = String(e?.file_path || '').trim();
                    if (!fp) continue;
                    if (ft && !ft.startsWith('image/') && !isProbablyImageFile(fp)) continue;

                    const img = await addImageFromFilePath(fp);
                    if (!img) continue;
                    const imgParaXml = buildImageParagraphXml(img.rId, img.cx, img.cy);
                    const $imgP = cheerio.load(imgParaXml, { xmlMode: true });
                    anchor = insertAfter(anchor, tightenParagraphSpacing($imgP.root().children().first(), { line: 276 }));

                    const caption = String(e?.caption || '').trim();
                    if (caption) {
                      const capNode = clearAndSetParagraphText(tplStepText, '');
                      const capOut = setParagraphRuns(capNode, [{ text: `Fig ${figNo}: ${caption}`, bold: false }]);
                      const capEl = insertAfter(anchor, tightenParagraphSpacing(capOut, { line: 276 }));
                      // Match template fig captions: line=276, jc=center, no indentation, no after spacing.
                      $(capEl).find('w\\:pPr > w\\:spacing').removeAttr('w:after');
                      $(capEl).find('w\\:pPr > w\\:ind').remove();
                      // Apply caption styling on the inserted element.
                      $(capEl).find('w\\:pPr').each((_: number, pPr: any) => {
                        let jc = $(pPr).children('w\\:jc').first();
                        if (!jc.length) { $(pPr).append('<w:jc w:val="center"/>'); }
                        else { jc.attr('w:val', 'center'); }
                      });
                      $(capEl).find('w\\:r').each((_: number, r: any) => {
                        let rPr = $(r).children('w\\:rPr').first();
                        if (!rPr.length) { $(r).prepend('<w:rPr/>'); rPr = $(r).children('w\\:rPr').first(); }
                        if (!rPr.children('w\\:i').length) rPr.append('<w:i w:val="1"/><w:iCs w:val="1"/>');
                        let c = rPr.children('w\\:color').first();
                        if (!c.length) rPr.append('<w:color w:val="9CA3AF"/>');
                        else c.attr('w:val', '9CA3AF');
                      });
                      anchor = capEl;
                      figNo += 1;
                    }
                  }
                }
              }
            }
           } else if (tplStepText && (tplStepText as any).length) {
             const pNode = clearAndSetParagraphText(tplStepText, 'No steps to reproduce were provided.');
             const $p = cheerio.load($.xml(pNode), { xmlMode: true });
             removeBoldFromParagraph($p);
               anchor = insertAfter(anchor, $p.root().children().first());
            }

          if (tplImpactLabel && (tplImpactLabel as any).length) {
            anchor = insertAfter(anchor, cloneNodeXml(tplImpactLabel));
          }
          const impact = extractValue(f?.impact);
          const likelihood = extractValue(f?.likelihood);
          if (tplImpactText && (tplImpactText as any).length) {
            const impactObj = (typeof f?.impact === 'object' && f?.impact) ? f.impact : null;
            const likelihoodObj = (typeof f?.likelihood === 'object' && f?.likelihood) ? f.likelihood : null;
            const impactSev = impactObj?.severity ? String(impactObj.severity) : '';
            const likelihoodSev = likelihoodObj?.severity ? String(likelihoodObj.severity) : '';

            const impactLine = impactSev ? ` (${impactSev})` : '';
            const likLine = likelihoodSev ? ` (${likelihoodSev})` : '';

            const iNode = clearAndSetParagraphText(tplImpactText, '');
            anchor = insertAfter(anchor, setParagraphRuns(iNode, [
              { text: 'Impact', bold: true },
              { text: `${impactLine}: ${impact}`, bold: false },
            ]));

            const lNode = clearAndSetParagraphText(tplImpactText, '');
            anchor = insertAfter(anchor, tightenParagraphSpacing(setParagraphRuns(lNode, [
              { text: 'Likelihood', bold: true },
              { text: `${likLine}: ${likelihood}`, bold: false },
            ]), { after: 120 }));
          }

          // Insert blank line before Recommendations (matches template spacing).
          if (tplRecsLabel && (tplRecsLabel as any).length) {
            anchor = insertAfter(anchor, clearAndSetParagraphText(tplRecsLabel, ''));
          }
          if (tplRecsLabel && (tplRecsLabel as any).length) {
            anchor = insertAfter(anchor, cloneNodeXml(tplRecsLabel));
          }
          const recRaw = f?.recommendation;
          const recArr = tryParseJsonArray(recRaw) || (Array.isArray(recRaw) ? recRaw : null);
          const recs = Array.isArray(recArr)
            ? recArr
            : typeof recRaw === 'string'
              ? recRaw.split(/\n+/)
              : [];
          const recLines = recs.map((r: any) => String(r || '').trim()).filter(Boolean);
          if (recLines.length && tplRecText && (tplRecText as any).length) {
            recLines.forEach((line: string) => {
              // Remove markdown-style **...** markers.
              const cleaned = line.replace(/\*\*/g, '').trim();
              const pNode = clearAndSetParagraphText(tplRecText, '');
              const idxColon = cleaned.indexOf(':');
              if (idxColon > 0) {
                const left = cleaned.slice(0, idxColon + 1);
                const right = cleaned.slice(idxColon + 1);
                anchor = insertAfter(anchor, tightenParagraphSpacing(setParagraphRuns(pNode, [
                  { text: left, bold: true },
                  { text: right ? ` ${right.trimStart()}` : '', bold: false },
                ]), { line: 276 }));
              } else {
                anchor = insertAfter(anchor, tightenParagraphSpacing(setParagraphRuns(pNode, [{ text: cleaned, bold: false }]), { line: 276 }));
              }
            });
          } else if (tplRecText && (tplRecText as any).length) {
            anchor = insertAfter(anchor, tightenParagraphSpacing(clearAndSetParagraphText(tplRecText, 'No recommendations provided.'), { line: 276 }));
          }

          if (tplRefLabel && (tplRefLabel as any).length) {
            anchor = insertAfter(anchor, cloneNodeXml(tplRefLabel));
          }
          const refs = Array.isArray(f?.references || f?.finding_references)
            ? (f.references || f.finding_references)
            : typeof (f?.references || f?.finding_references) === 'string'
              ? String(f.references || f.finding_references).split(/\n+/)
              : [];
          const refLines = refs
            .map((r: any) => (typeof r === 'string' ? r : (r?.url || r?.title || '')))
            .map((s: any) => String(s || '').trim())
            .filter(Boolean);

          // Insert references. Trim an accidental trailing dot when the reference is a URL
          // (many editors or sources append a period to the end of a sentence which then
          // appears after the link in PDF output). Preserve non-URL reference punctuation.
          if (refLines.length && tplRefText && (tplRefText as any).length) {
            refLines.forEach((line: string) => {
              let refText = String(line || '').trim();
              if (/^(https?:\/\/|www\.)/i.test(refText) && refText.endsWith('.')) {
                refText = refText.replace(/\.+$/g, '');
              }
              // Clone the template reference paragraph and apply real Word bullet formatting.
              // Uses numId=2 (the reference bullet list in the BlueAlly template).
              const pNode = clearAndSetParagraphText(tplRefText, '');
              {
                const $pLocal = cheerio.load($.xml(pNode), { xmlMode: true });
                // Remove any existing numPr and set the reference bullet numPr.
                $pLocal('w\\:pPr > w\\:numPr').remove();
                const pPrEl = $pLocal('w\\:pPr').first();
                if (pPrEl.length) {
                  pPrEl.append('<w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr>');
                  // Strip paragraph-level rPr color so the bullet marker renders black, not gray.
                  pPrEl.children('w\\:rPr').remove();
                }
                // Remove all existing runs and hyperlinks, then add URL text as blue underlined hyperlink.
                $pLocal('w\\:r').remove();
                $pLocal('w\\:hyperlink').remove();
                $pLocal('w\\:pPr').after(
                  `<w:r><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr>` +
                  `<w:t xml:space="preserve">${refText}</w:t></w:r>`
                );
                const cleaned = $pLocal.root().children().first();
                anchor = insertAfter(anchor, cleaned);
              }
            });
          }

          if (tplBack && (tplBack as any).length) {
            anchor = insertAfter(anchor, cloneNodeXml(tplBack));
          }
        }
      }
    }

    zip.file(documentPath, $.xml());
    zip.file(relsPath, $rels.xml());
    return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  },
};
