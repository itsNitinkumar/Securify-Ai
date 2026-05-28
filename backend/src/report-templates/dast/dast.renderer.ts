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
      if (settingsEl.length && !settingsEl.find('w\\:updateFields').length) {
        settingsEl.prepend('<w:updateFields w:val="true"/>');
        templateZip.file('word/settings.xml', Buffer.from($settings.xml()));
      }
    }
  }

  // --- Replace placeholders ---
  const clientName = String(data.project?.client_name || 'Client');
  const startDate = data.project?.start_date ? formatDate(new Date(data.project.start_date), 'MMMM dd, yyyy') : '';
  const endDate = data.project?.end_date ? formatDate(new Date(data.project.end_date), 'MMMM dd, yyyy') : '';

  body.find('w\\:p').each((_: number, p: any) => {
    let txt = paraText($, p);
    if (!txt) return;
    let changed = false;
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

  // --- Regenerate TOC entries based on actual findings ---
  const tpFindingsToc = (data.findings || []).filter((f: any) => String(f.finding_type || '') !== 'false_positive');
  const fpFindingsToc = (data.findings || []).filter((f: any) => String(f.finding_type || '') === 'false_positive');
  const tocEntries = [
    'Scope', 'Application Details', 'User Roles', 'Tools',
    'Assessment Limitation', 'Vulnerabilities', 'Summary',
    'Detailed Vulnerabilities',
  ];
  if (tpFindingsToc.length) tocEntries.push('True Positive');
  for (const f of tpFindingsToc) tocEntries.push(cleanTitle(f.title, false));
  if (fpFindingsToc.length) tocEntries.push('False Positive');
  for (const f of fpFindingsToc) tocEntries.push(cleanTitle(f.title, true));

  // Find TOC field paragraph and Scope heading using nextUntil-style traversal
  const tocFieldP = body.find('w\\:instrText').filter((_: number, el: any) => {
    return $(el).text().includes('TOC');
  }).first().closest('w\\:p');

  const scopeP = body.find('w\\:p').filter((_: number, p: any) => {
    const ps = $(p).find('w\\:pPr w\\:pStyle');
    return ps.length === 1 && String(ps.attr('w:val')) === 'Heading1' && paraText($, p).toLowerCase() === 'scope';
  }).first();

  if (tocFieldP.length > 0 && scopeP.length > 0) {
    // Find template entry (first non-empty paragraph between tocFieldP and scopeP)
    let tocTemplateP: any = null;
    let iter = tocFieldP.next();
    while (iter.length > 0 && !iter.is(scopeP)) {
      if (paraText($, iter).length > 0) {
        tocTemplateP = cloneNode($, iter.get(0));
        break;
      }
      iter = iter.next();
    }

    // Remove old TOC entries (non-empty paragraphs only)
    iter = tocFieldP.next();
    while (iter.length > 0 && !iter.is(scopeP)) {
      const nextP = iter.next();
      if (paraText($, iter).length > 0) iter.remove();
      iter = nextP;
    }

    // Insert new TOC entries with hyperlinks and PAGEREF fields for page
    // numbers (so Word resolves correct page numbers automatically).
    if (tocTemplateP) {
      let anchor = tocFieldP.get(0);
      const topLevelTitles = ['Scope', 'Vulnerabilities', 'True Positive', 'False Positive'];

      tocEntries.forEach((title: string) => {
        const newP = cloneNode($, tocTemplateP);

        // Find the hyperlink element (contains the title/ tab/ page runs)
        const hyperlink = newP.find('w\\:hyperlink');
        const bookmarkName = hyperlink.attr('w:anchor') || '';

        // Find the run inside the hyperlink (it contains w:t, w:tab, w:t)
        const hlRun = hyperlink.children('w\\:r').first();
        if (!hlRun.length) return;

        // Replace the title text (first w:t)
        const allT = hlRun.find('w\\:t');
        if (allT.length > 0) {
          allT.first().replaceWith(`<w:t xml:space="preserve">${escapeXmlText(title)}</w:t>`);
        }

        // Remove the page-number w:t (the second one) — we'll replace with
        // a PAGEREF field that Word resolves on open.
        if (allT.length > 1) allT.last().remove();

        // Copy the rPr from the title run for the PAGEREF placeholder run
        const rPrXml = hlRun.find('w\\:rPr').length
          ? $.xml(hlRun.find('w\\:rPr').first()) : '';

        // Build the PAGEREF field codes: Word resolves this to the correct
        // page number when the document is opened (updateFields is true).
        const pageFieldXml =
          `<w:r><w:fldChar w:fldCharType="begin"/></w:r>` +
          `<w:r><w:instrText xml:space="preserve"> PAGEREF ${bookmarkName} \\h </w:instrText></w:r>` +
          `<w:r><w:fldChar w:fldCharType="separate"/></w:r>` +
          `<w:r>${rPrXml}<w:t xml:space="preserve">1</w:t></w:r>` +
          `<w:r><w:fldChar w:fldCharType="end"/></w:r>`;

        hlRun.after(pageFieldXml);

        // Apply bold/light + indent for sub-entries
        const isTopLevel = topLevelTitles.includes(title);
        if (!isTopLevel) {
          newP.find('w\\:b').remove();
          newP.find('w\\:bCs').remove();
          let pPr = newP.find('w\\:pPr').first();
          if (!pPr.length) {
            newP.prepend('<w:pPr/>');
            pPr = newP.find('w\\:pPr').first();
          }
          if (!pPr.find('w\\:ind').length) {
            pPr.append('<w:ind w:left="720"/>');
          }
        }

        $(anchor).after(newP);
        anchor = newP.get(0);
      });
    }

    // Also clear the stale page-number text in the TOC field paragraph's
    // own hyperlink (the "Table of Contents 2" heading text).
    const tocFieldHyperlinkT = tocFieldP.find('w\\:hyperlink w\\:t');
    if (tocFieldHyperlinkT.length > 0) {
      for (let ti = 1; ti < tocFieldHyperlinkT.length; ti++) {
        tocFieldHyperlinkT.eq(ti).text('');
      }
    }
  }

  // Remove yellow highlights
  body.find('w\\:highlight').remove();
  body.find('w\\:shd').each((_: number, shd: any) => {
    const fill = String($(shd).attr('w:fill') || '').toUpperCase();
    if (fill === 'FFFF00' || fill === 'FF0') $(shd).remove();
  });

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
            setParaText($summaryTbl, cells[2], 'N/A');
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

    // Find sectPr before removing detail nodes
    const sectPrFromDetail = detailNodes.find((el: any) => el.tagName === 'w:sectPr');

    // Remove all detail nodes (except sectPr)
    for (const el of detailNodes) {
      if (el === sectPrFromDetail) continue;
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

    const removeBetweenLabels = (sd: any, sr: any, labelEl: any, newItems: string[], customTemplateXml?: string) => {
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
          sd(tNodes[0]).replaceWith(`<w:t xml:space="preserve">${escapeXmlText(String(item ?? ''))}</w:t>`);
          for (let ri = 1; ri < tNodes.length; ri++) sd(tNodes[ri]).text('');
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
      if (tpHeadingEl) $(insertTarget).before($.xml(cloneNode($, tpHeadingEl)));
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

        if (titlePara) sectionSetText(sd, titlePara, cleanTitle(finding.title, false));

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
          removeBetweenLabels(sd, sr, urlLabel, urls.length ? urls : ['N/A']);
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
            const xml = `<w:p><w:pPr><w:spacing w:after="200" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">Impact:</w:t></w:r><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve"> ${sevPrefix}</w:t></w:r><w:r><w:rPr><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${escapeXmlText(impact)}</w:t></w:r></w:p>`;
            sd(insertPt).after(xml);
            insertPt = sd(insertPt).next().get(0);
          }
          if (likelihood) {
            const sev = String(finding.likelihood?.severity || '').trim();
            const xml = `<w:p><w:pPr><w:spacing w:after="200" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">Likelihood:</w:t></w:r><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve"> ${sev ? `${sev} – ` : ''}</w:t></w:r><w:r><w:rPr><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${escapeXmlText(likelihood)}</w:t></w:r></w:p>`;
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
          removeBetweenLabels(sd, sr, refLabel, refs.map((r: any) => String(r || '')), refTemplate || undefined);
        }

        const sectionXml = sr.children().toArray().map((el: any) => sd.xml(el)).join('');
        $(insertTarget).before(sectionXml);
      }
    }

    // Insert "False Positive" heading once, then FP findings
    if (fpBodyProto && fpFindings.length > 0) {
      if (fpHeadingEl) $(insertTarget).before($.xml(cloneNode($, fpHeadingEl)));
      for (let i = 0; i < fpFindings.length; i++) {
        const finding = fpFindings[i];
        const sd = makeSectionDoc(fpBodyProto);
        const sr = sd('root');
        const titlePara = findTitlePara(sd, sr);
        const descLabel = sectionFindByText(sd, 'Description:');
        const urlLabel = sectionFindByText(sd, 'Affected URL:') || sectionFindByText(sd, 'Affected Target:');

        if (titlePara) sectionSetText(sd, titlePara, cleanTitle(finding.title, true));

        if (descLabel) {
          const desc = String(finding.description || finding.detail || '');
          removeBetweenLabels(sd, sr, descLabel, desc ? [desc] : ['No description provided.']);
        }
        if (urlLabel) {
          const urls: string[] = [];
          if (Array.isArray(finding.affected_urls)) urls.push(...finding.affected_urls.map((u: any) => String(u.url || u)));
          else if (finding.affected_url) urls.push(String(finding.affected_url));
          else if (finding.affected_target) urls.push(String(finding.affected_target));
          removeBetweenLabels(sd, sr, urlLabel, urls.length ? urls : ['N/A']);
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

        const sectionXml = sr.children().toArray().map((el: any) => sd.xml(el)).join('');
        $(insertTarget).before(sectionXml);
      }
    }
  }

  // Write full document.xml back to zip
  templateZip.file('word/document.xml', Buffer.from($.xml()));
  templateZip.file(relsPath, Buffer.from($rels.xml()));

  const outBuf = await templateZip.generateAsync({ type: 'nodebuffer' });
  return outBuf;
}

export const DastRenderer: TemplateRenderer = { key, matches, generateDocxBuffer };
