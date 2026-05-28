const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const cheerio = require('cheerio');

async function patchDastDocxForLibreOfficePdf(docxBuffer) {
  const zip = new PizZip(docxBuffer);

  // 1) Bullet list fix - green bullets
  const numberingXml = zip.file('word/numbering.xml')?.asText() || '';
  const docPath = 'word/document.xml';
  const docXml = zip.file(docPath)?.asText() || '';
  if (numberingXml && docXml) {
    const $n = cheerio.load(numberingXml, { xmlMode: true });
    const $d = cheerio.load(docXml, { xmlMode: true });
    const numIdToAbstract = new Map();
    $n('w\\:num').each((_, num) => {
      const numId = String($n(num).attr('w:numId') || '');
      const abs = String($n(num).find('w\\:abstractNumId').first().attr('w:val') || '');
      if (numId && abs) numIdToAbstract.set(numId, abs);
    });
    const absToLvlFmt = new Map();
    $n('w\\:abstractNum').each((_, abs) => {
      const absId = String($n(abs).attr('w:abstractNumId') || '');
      if (!absId) return;
      const lvlMap = new Map();
      $n(abs).find('w\\:lvl').each((__, lvl) => {
        const ilvl = String($n(lvl).attr('w:ilvl') || '');
        const fmt = String($n(lvl).find('w\\:numFmt').first().attr('w:val') || '');
        if (ilvl && fmt) lvlMap.set(ilvl, fmt);
      });
      absToLvlFmt.set(absId, lvlMap);
    });
    const isHeadingOrTocPara = (p) => {
      const pPr = $d(p).children('w\\:pPr').first();
      const pStyle = String(pPr.find('w\\:pStyle').first().attr('w:val') || '');
      if (/^Heading\d+$/.test(pStyle)) return true;
      if (/^TOC/i.test(pStyle)) return true;
      return false;
    };
    let bulletsConverted = 0;
    $d('w\\:p').each((_, p) => {
      const pPr = $d(p).children('w\\:pPr').first();
      if (!pPr.length) return;
      const numPr = pPr.children('w\\:numPr').first();
      if (!numPr.length) return;
      if (isHeadingOrTocPara(p)) return;
      const numId = String(numPr.find('w\\:numId').first().attr('w:val') || '');
      const ilvl = String(numPr.find('w\\:ilvl').first().attr('w:val') || '0');
      const absId = numIdToAbstract.get(numId);
      const fmt = absId ? absToLvlFmt.get(absId)?.get(ilvl) : undefined;
      if (fmt !== 'bullet') return;
      numPr.remove();
      let ind = pPr.children('w\\:ind').first();
      if (!ind.length) { pPr.append('<w:ind/>'); ind = pPr.children('w\\:ind').first(); }
      ind.attr('w:left', '720');
      ind.attr('w:hanging', '360');
      const bulletRun = '<w:r><w:rPr><w:color w:val="4EBc22"/></w:rPr><w:t xml:space="preserve">\u2022\t</w:t></w:r>';
      const firstR = $d(p).children('w\\:r').first();
      if (firstR.length) firstR.before(bulletRun);
      else { const pPrNode = pPr.get(0); if (pPrNode) $d(pPrNode).after(bulletRun); else $d(p).prepend(bulletRun); }
      bulletsConverted++;
    });
    console.log(`[DAST Patch] Converted ${bulletsConverted} bullet list paragraph(s) to green explicit bullets`);
    zip.file(docPath, $d.xml());
  }

  // 2) Table shading - green headers, green body rows
  const docXml2 = zip.file(docPath)?.asText() || '';
  if (docXml2) {
    const $ = cheerio.load(docXml2, { xmlMode: true });
    let tablesPatched = 0;
    $('w\\:tbl').each((_, tbl) => {
      const rows = $(tbl).find('> w\\:tr').toArray();
      if (rows.length < 1) return;
      let tblPr = $(tbl).children('w\\:tblPr').first();
      if (!tblPr.length) { $(tbl).prepend('<w:tblPr/>'); tblPr = $(tbl).children('w\\:tblPr').first(); }
      tblPr.find('w\\:tblBorders').remove();
      tblPr.prepend('<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="4EBc22"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="4EBc22"/><w:left w:val="single" w:sz="4" w:space="0" w:color="4EBc22"/><w:right w:val="single" w:sz="4" w:space="0" w:color="4EBc22"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="4EBc22"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="4EBc22"/></w:tblBorders>');
      let tblW = tblPr.find('w\\:tblW').first();
      if (tblW.length) { tblW.attr('w:type', 'pct'); tblW.attr('w:w', '5000'); }
      else { tblPr.prepend('<w:tblW w:type="pct" w:w="5000"/>'); }

      // Green header row
      $(rows[0]).find('> w\\:tc').each((__, tc) => {
        let tcPr = $(tc).children('w\\:tcPr').first();
        if (!tcPr.length) { $(tc).prepend('<w:tcPr/>'); tcPr = $(tc).children('w\\:tcPr').first(); }
        let shd = tcPr.children('w\\:shd').first();
        if (shd.length) { shd.attr('w:val', 'clear'); shd.attr('w:color', 'auto'); shd.attr('w:fill', '4EBc22'); }
        else { tcPr.append('<w:shd w:val="clear" w:color="auto" w:fill="4EBc22"/>'); }
        $(tc).find('w\\:r').each((___, r) => {
          let rPr = $(r).children('w\\:rPr').first();
          if (!rPr.length) { $(r).prepend('<w:rPr/>'); rPr = $(r).children('w\\:rPr').first(); }
          let colorNode = rPr.children('w\\:color').first();
          if (!colorNode.length) { rPr.append('<w:color w:val="FFFFFF"/>'); }
          else { colorNode.attr('w:val', 'FFFFFF'); }
        });
      });

      // Light green body rows
      for (let ri = 1; ri < rows.length; ri++) {
        const bodyFill = ri % 2 === 0 ? 'eafde3' : 'd9f6ce';
        $(rows[ri]).find('> w\\:tc').each((__, tc) => {
          let tcPr = $(tc).children('w\\:tcPr').first();
          if (!tcPr.length) { $(tc).prepend('<w:tcPr/>'); tcPr = $(tc).children('w\\:tcPr').first(); }
          let shd = tcPr.children('w\\:shd').first();
          if (shd.length) { shd.attr('w:val', 'clear'); shd.attr('w:color', 'auto'); shd.attr('w:fill', bodyFill); }
          else { tcPr.append(`<w:shd w:val="clear" w:color="auto" w:fill="${bodyFill}"/>`); }
        });
      }
      tablesPatched++;
    });
    console.log(`[DAST Patch] Patched ${tablesPatched} table(s) with green borders and shading`);
    zip.file(docPath, $.xml());
  }

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

async function main() {
  const docxPath = path.join(__dirname, 'reports/securify_DAST_testing_1779986939929.docx');
  if (!fs.existsSync(docxPath)) { console.error('Not found:', docxPath); process.exit(1); }

  const docxBuffer = fs.readFileSync(docxPath);
  console.log(`Read ${docxBuffer.length} bytes from ${docxPath}`);

  const patched = await patchDastDocxForLibreOfficePdf(docxBuffer);
  fs.writeFileSync('/tmp/dast-patched-v2.docx', patched);
  console.log(`Patched DOCX: ${patched.length} bytes`);

  const tempDir = '/tmp/dast-pdf-test-v2';
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  fs.writeFileSync(path.join(tempDir, 'report.docx'), patched);

  const { execFileSync } = require('child_process');
  try {
    execFileSync('/usr/bin/soffice', ['--headless', '--convert-to', 'pdf:writer_pdf_Export', '--outdir', tempDir, path.join(tempDir, 'report.docx')], { timeout: 120000 });
    const pdfPath = path.join(tempDir, 'report.pdf');
    if (fs.existsSync(pdfPath)) {
      fs.copyFileSync(pdfPath, '/tmp/dast-patched-v2.pdf');
      console.log(`PDF output: /tmp/dast-patched-v2.pdf (${fs.statSync(pdfPath).size} bytes)`);
    }
  } catch (err) { console.error('PDF conversion failed:', err.message); }
}

main().catch(console.error);
