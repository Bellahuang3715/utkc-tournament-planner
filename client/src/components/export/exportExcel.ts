import ExcelJS from "exceljs";
import JSZip from "jszip";
import {
  BracketWithPlayers,
  BracketWithTeams,
} from "../../interfaces/bracket";
import { toUIPlayers, toUITeams } from "../../services/bracket";
import type { TextStyle } from "../utils/brackets_editor/shared";
import { DEFAULT_POSTER } from "../utils/brackets_editor/shared";
import {
  bracketPlayerTemplateUrl,
  bracketTeamTemplateUrl,
  getBracketPlayerTemplate,
  getBracketTeamTemplate,
  resolveBracketSheetLayout,
  type BracketExportFormat,
  type BracketExportPlayer,
  type BracketExportTeam,
  type BracketFillStyles,
  type BracketSheetLayout,
} from "./bracket_templates";

function excelFontName(fontFamily?: string): string | undefined {
  if (!fontFamily) return undefined;
  const first = String(fontFamily).split(",")[0].trim();
  return first.replace(/^['"]|['"]$/g, "") || undefined;
}

function excelArgb(color?: string): string | undefined {
  if (!color) return undefined;
  const raw = String(color).trim();
  if (raw.startsWith("#")) {
    let hex = raw.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    if (hex.length === 6) return `FF${hex.toUpperCase()}`;
  }
  const rgb = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) {
    const toHex = (n: string) =>
      Number(n).toString(16).padStart(2, "0").toUpperCase();
    return `FF${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`;
  }
  return undefined;
}

function applyFont(
  cell: ExcelJS.Cell,
  opts: Partial<TextStyle> & { bold?: boolean } = {},
) {
  const next: Partial<ExcelJS.Font> = { ...(cell.font ?? {}) };
  const name = excelFontName(opts.fontFamily);
  if (name) next.name = name;
  if (opts.fontSize != null) next.size = Number(opts.fontSize);
  const argb = excelArgb(opts.color);
  if (argb) next.color = { argb };
  if (opts.bold != null) next.bold = Boolean(opts.bold);
  cell.font = next;
}

function setCell(
  sheet: ExcelJS.Worksheet,
  address: string,
  value: string | number | null | undefined,
  fontOpts?: Partial<TextStyle> & { bold?: boolean },
) {
  const cell = sheet.getCell(address);
  cell.value =
    value === undefined || value === null || value === "" ? null : value;
  if (fontOpts) applyFont(cell, fontOpts);
}

function formatName(player: BracketExportPlayer | undefined): string {
  if (!player) return "";
  if (player.noShow) return "No Show";
  const name = (player.name ?? "").trim();
  const club = (player.club ?? "").trim();
  if (!name) return "";
  return club ? `${name} (${club})` : name;
}

export function fillBracketPlayerSheet(
  sheet: ExcelJS.Worksheet,
  layout: BracketSheetLayout,
  players: BracketExportPlayer[],
  opts: {
    styles?: BracketFillStyles;
    templateFile?: string;
  } = {},
) {
  if (layout.openingSlots.length === 0) {
    throw new Error(
      `Template map for ${opts.templateFile ?? layout.sheet} (${layout.sheet}) has no openingSlots defined yet`,
    );
  }

  const idFont = {
    fontFamily: opts.styles?.idStyle?.fontFamily,
    fontSize: opts.styles?.idStyle?.fontSize,
    color: opts.styles?.idStyle?.color,
    bold: true,
  };
  const nameFont = {
    fontFamily: opts.styles?.textStyle?.fontFamily,
    fontSize: opts.styles?.textStyle?.fontSize,
    color: opts.styles?.textStyle?.color,
  };

  layout.openingSlots.forEach((cells, i) => {
    const p = players[i];
    if (cells.id) {
      setCell(sheet, cells.id, p?.noShow ? "—" : (p?.id ?? ""), idFont);
    }
    if (cells.score) {
      setCell(sheet, cells.score, p?.noShow ? "—" : (p?.score ?? ""), idFont);
    }
    setCell(sheet, cells.name, formatName(p), nameFont);
  });
}

export function fillBracketTeamSheet(
  sheet: ExcelJS.Worksheet,
  layout: BracketSheetLayout,
  teams: BracketExportTeam[],
  opts: {
    styles?: BracketFillStyles;
    templateFile?: string;
  } = {},
) {
  if (layout.openingSlots.length === 0) {
    throw new Error(
      `Template map for ${opts.templateFile ?? layout.sheet} (${layout.sheet}) has no openingSlots defined yet`,
    );
  }

  const nameFont = {
    fontFamily: opts.styles?.textStyle?.fontFamily,
    fontSize: opts.styles?.textStyle?.fontSize,
    color: opts.styles?.textStyle?.color,
  };

  layout.openingSlots.forEach((cells, i) => {
    const t = teams[i];
    const name = (t?.name ?? "").trim();
    setCell(sheet, cells.name, name === "TBD" ? "" : name, nameFont);
  });
}

async function loadTemplateWorkbook(url: string): Promise<ExcelJS.Workbook> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load template (${res.status}): ${url}`);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await res.arrayBuffer());
  return workbook;
}

function toExportPlayers(
  b: BracketWithPlayers,
  clubAbbrevByName?: Map<string, string>,
): BracketExportPlayer[] {
  return toUIPlayers(b).map((p) => ({
    id: p.id === "—" ? "" : p.id,
    name: p.name === "TBD" ? "" : p.name,
    club: p.club ? (clubAbbrevByName?.get(p.club) ?? p.club) : p.club,
  }));
}

function toExportTeams(b: BracketWithTeams): BracketExportTeam[] {
  return toUITeams(b).map((t) => ({
    name: t.name === "TBD" ? "" : t.name,
  }));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** JSZip defaults to STORE (no compression); xlsx needs DEFLATE. */
const XLSX_ZIP_OPTIONS = {
  compression: "DEFLATE" as const,
  compressionOptions: { level: 6 },
};

function resolveXlPath(target: string, fromDir = "xl"): string {
  if (target.startsWith("/")) return target.slice(1);
  if (target.startsWith("xl/")) return target;
  // Target is relative to fromDir (e.g. "worksheets/sheet1.xml" from xl/)
  const baseParts = fromDir.split("/").filter(Boolean);
  const parts = target.split("/");
  for (const p of parts) {
    if (p === "..") baseParts.pop();
    else if (p !== ".") baseParts.push(p);
  }
  return baseParts.join("/");
}

type SheetRef = {
  name: string;
  rid: string;
  sheetPath: string;
  sheetFile: string;
};

async function listWorkbookSheets(zip: JSZip): Promise<SheetRef[]> {
  const wbXml = await zip.file("xl/workbook.xml")!.async("string");
  const relsXml = await zip
    .file("xl/_rels/workbook.xml.rels")!
    .async("string");

  const sheets: SheetRef[] = [];
  for (const m of wbXml.matchAll(
    /<sheet[^>]*name="([^"]*)"[^>]*r:id="(rId\d+)"[^>]*\/>/g,
  )) {
    const name = m[1];
    const rid = m[2];
    const targetMatch = relsXml.match(
      new RegExp(
        `<Relationship[^>]*Id="${rid}"[^>]*Target="([^"]+)"[^>]*/>`,
      ),
    );
    if (!targetMatch) {
      throw new Error(`Missing workbook relationship for ${rid}`);
    }
    const sheetPath = resolveXlPath(targetMatch[1], "xl");
    sheets.push({
      name,
      rid,
      sheetPath,
      sheetFile: sheetPath.split("/").pop()!,
    });
  }
  return sheets;
}

/**
 * Like Storybook: ExcelJS only fills cells and writes the full workbook.
 * Then strip to one sheet at the OOXML level — ExcelJS removeWorksheet
 * prunes shared styles and breaks bracket borders/lines.
 */
async function extractNamedSheetAsWorkbook(
  filledBuffer: ExcelJS.Buffer,
  sourceSheetName: string,
  destSheetName: string,
): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(filledBuffer);
  const sheets = await listWorkbookSheets(zip);
  const keep = sheets.find((s) => s.name === sourceSheetName);
  if (!keep) {
    throw new Error(`Worksheet "${sourceSheetName}" not found after fill`);
  }

  // Drop other worksheet parts (+ their rels).
  for (const s of sheets) {
    if (s.sheetPath === keep.sheetPath) continue;
    zip.remove(s.sheetPath);
    const rels = `xl/worksheets/_rels/${s.sheetFile}.rels`;
    if (zip.file(rels)) zip.remove(rels);
  }

  const safeName = destSheetName.slice(0, 31);
  const wbXml = await zip.file("xl/workbook.xml")!.async("string");
  const newSheets = `<sheets><sheet name="${xmlEscape(safeName)}" sheetId="1" r:id="${keep.rid}"/></sheets>`;
  zip.file(
    "xl/workbook.xml",
    wbXml.replace(/<sheets>[\s\S]*?<\/sheets>/, newSheets),
  );

  const relsXml = await zip
    .file("xl/_rels/workbook.xml.rels")!
    .async("string");
  const keptRels = [...relsXml.matchAll(/<Relationship[^>]*\/>/g)]
    .map((m) => m[0])
    .filter((line) => {
      if (!line.includes("/relationships/worksheet")) return true;
      return line.includes(`Id="${keep.rid}"`);
    });
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `${keptRels.join("")}</Relationships>`,
  );

  // Content types: drop overrides for removed worksheets.
  const ct = await zip.file("[Content_Types].xml")!.async("string");
  const keepPart = `/${keep.sheetPath}`;
  let newCt = ct.replace(
    /<Override[^>]*PartName="\/xl\/worksheets\/[^"]*"[^>]*\/>/g,
    (override) => (override.includes(keepPart) ? override : ""),
  );
  zip.file("[Content_Types].xml", newCt);

  return zip.generateAsync({ type: "arraybuffer", ...XLSX_ZIP_OPTIONS });
}

/** Raw `<si>…</si>` entries from a workbook's sharedStrings.xml. */
function parseSharedStringItems(sstXml: string): string[] {
  return [...sstXml.matchAll(/<si>[\s\S]*?<\/si>/g)].map((m) => m[0]);
}

/**
 * Remap `t="s"` cell indexes so a sheet can use a concatenated sharedStrings table.
 * Without this, every filled template reuses low indexes (0,1,2…) and Group 2
 * would resolve against Group 1's strings after merge.
 */
function remapSheetSharedStringIndexes(
  sheetXml: string,
  indexOffset: number,
): string {
  if (indexOffset === 0) return sheetXml;
  return sheetXml.replace(
    /<c\b([^>]*\bt="s"[^>]*)>([\s\S]*?)<\/c>/g,
    (full, attrs: string, body: string) => {
      const nextBody = body.replace(
        /<v>(\d+)<\/v>/,
        (_v, n: string) => `<v>${indexOffset + Number(n)}</v>`,
      );
      return `<c${attrs}>${nextBody}</c>`;
    },
  );
}

function buildSharedStringsXml(items: string[]): string {
  const count = items.length;
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `count="${count}" uniqueCount="${count}">` +
    items.join("") +
    `</sst>`
  );
}

/** Child elements of a counted styles.xml section (`<font>…`, `<xf …/>`, …). */
function parseStyleSectionItems(sectionInner: string, itemTag: string): string[] {
  const re = new RegExp(
    `<${itemTag}\\b[^>]*\\/>|<${itemTag}\\b[^>]*>[\\s\\S]*?<\\/${itemTag}>`,
    "g",
  );
  return [...sectionInner.matchAll(re)].map((m) => m[0]);
}

function getStyleSection(
  stylesXml: string,
  tag: string,
): { inner: string; items: string[] } {
  const m = stylesXml.match(
    new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`),
  );
  if (!m) return { inner: "", items: [] };
  const itemTag =
    tag === "numFmts"
      ? "numFmt"
      : tag === "fonts"
        ? "font"
        : tag === "fills"
          ? "fill"
          : tag === "borders"
            ? "border"
            : tag === "cellStyleXfs" || tag === "cellXfs"
              ? "xf"
              : tag === "dxfs"
                ? "dxf"
                : "";
  return {
    inner: m[1],
    items: itemTag ? parseStyleSectionItems(m[1], itemTag) : [],
  };
}

function replaceStyleSection(
  stylesXml: string,
  tag: string,
  items: string[],
): string {
  const body = items.join("");
  const next = `<${tag} count="${items.length}">${body}</${tag}>`;
  if (new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`).test(stylesXml)) {
    return stylesXml.replace(
      new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`),
      next,
    );
  }
  // Insert before cellXfs if missing (e.g. numFmts).
  if (tag === "numFmts") {
    return stylesXml.replace(/<fonts\b/, `${next}<fonts`);
  }
  return stylesXml;
}

/**
 * Remap font/fill/border (and custom numFmt) indexes inside an `<xf>` when
 * appending one workbook's cellXfs onto another's styles.xml.
 */
function remapXfComponentIndexes(
  xfXml: string,
  offsets: {
    font: number;
    fill: number;
    border: number;
    numFmtIdMap: Map<number, number>;
  },
): string {
  return xfXml
    .replace(/\bfontId="(\d+)"/g, (_m, n: string) => {
      return `fontId="${offsets.font + Number(n)}"`;
    })
    .replace(/\bfillId="(\d+)"/g, (_m, n: string) => {
      return `fillId="${offsets.fill + Number(n)}"`;
    })
    .replace(/\bborderId="(\d+)"/g, (_m, n: string) => {
      return `borderId="${offsets.border + Number(n)}"`;
    })
    .replace(/\bnumFmtId="(\d+)"/g, (_m, n: string) => {
      const id = Number(n);
      const mapped = offsets.numFmtIdMap.get(id);
      return `numFmtId="${mapped ?? id}"`;
    })
    // Keep pointing at the first workbook's cellStyleXfs[0].
    .replace(/\bxfId="\d+"/g, `xfId="0"`);
}

/** Remap cell `s="N"` style indexes after concatenating cellXfs tables. */
function remapSheetStyleIndexes(sheetXml: string, cellXfOffset: number): string {
  if (cellXfOffset === 0) return sheetXml;
  return sheetXml.replace(
    /\bs="(\d+)"/g,
    (_m, n: string) => `s="${cellXfOffset + Number(n)}"`,
  );
}

type MergedStylesState = {
  /** styles.xml from the first part; sections are replaced as we append. */
  xml: string;
  numFmts: string[];
  fonts: string[];
  fills: string[];
  borders: string[];
  cellXfs: string[];
};

function createMergedStylesState(firstStylesXml: string): MergedStylesState {
  return {
    xml: firstStylesXml,
    numFmts: getStyleSection(firstStylesXml, "numFmts").items,
    fonts: getStyleSection(firstStylesXml, "fonts").items,
    fills: getStyleSection(firstStylesXml, "fills").items,
    borders: getStyleSection(firstStylesXml, "borders").items,
    cellXfs: getStyleSection(firstStylesXml, "cellXfs").items,
  };
}

function nextCustomNumFmtId(numFmts: string[]): number {
  let max = 163;
  for (const item of numFmts) {
    const m = item.match(/\bnumFmtId="(\d+)"/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

/**
 * Append another workbook's style tables onto the merge master.
 * Returns the cellXf index offset to apply to that workbook's sheet XML.
 */
function appendStylesFromWorkbook(
  state: MergedStylesState,
  stylesXml: string,
): number {
  const cellXfOffset = state.cellXfs.length;
  const addNumFmts = getStyleSection(stylesXml, "numFmts").items;
  const addFonts = getStyleSection(stylesXml, "fonts").items;
  const addFills = getStyleSection(stylesXml, "fills").items;
  const addBorders = getStyleSection(stylesXml, "borders").items;
  const addCellXfs = getStyleSection(stylesXml, "cellXfs").items;

  const numFmtIdMap = new Map<number, number>();
  let nextNumFmtId = nextCustomNumFmtId(state.numFmts);
  for (const item of addNumFmts) {
    const m = item.match(/\bnumFmtId="(\d+)"/);
    const oldId = m ? Number(m[1]) : nextNumFmtId;
    const newId = nextNumFmtId++;
    numFmtIdMap.set(oldId, newId);
    state.numFmts.push(
      item.replace(/\bnumFmtId="\d+"/, `numFmtId="${newId}"`),
    );
  }

  const offsets = {
    font: state.fonts.length,
    fill: state.fills.length,
    border: state.borders.length,
    numFmtIdMap,
  };

  state.fonts.push(...addFonts);
  state.fills.push(...addFills);
  state.borders.push(...addBorders);
  state.cellXfs.push(
    ...addCellXfs.map((xf) => remapXfComponentIndexes(xf, offsets)),
  );

  return cellXfOffset;
}

function buildMergedStylesXml(state: MergedStylesState): string {
  let xml = state.xml;
  if (state.numFmts.length > 0) {
    xml = replaceStyleSection(xml, "numFmts", state.numFmts);
  }
  xml = replaceStyleSection(xml, "fonts", state.fonts);
  xml = replaceStyleSection(xml, "fills", state.fills);
  xml = replaceStyleSection(xml, "borders", state.borders);
  xml = replaceStyleSection(xml, "cellXfs", state.cellXfs);
  return xml;
}

/**
 * Merge several single-sheet .xlsx buffers into one workbook.
 * Copies sheet XML as-is (with sharedString + style index remaps) so template
 * styling stays intact even when groups use different size templates.
 */
async function mergeSingleSheetWorkbooks(
  parts: Array<{ sheetName: string; buffer: ArrayBuffer }>,
): Promise<Blob> {
  if (parts.length === 0) {
    throw new Error("Nothing to merge");
  }
  if (parts.length === 1) {
    return new Blob([parts[0].buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  const zips = await Promise.all(
    parts.map((p) => JSZip.loadAsync(p.buffer)),
  );
  const out = zips[0];

  const masterShared: string[] = [];
  const firstStylesXml = await zips[0].file("xl/styles.xml")!.async("string");
  const stylesState = createMergedStylesState(firstStylesXml);
  /** Identical styles.xml → reuse the same cellXf offset (no duplicate append). */
  const stylesOffsetByXml = new Map<string, number>([[firstStylesXml, 0]]);
  const sheetInfos: Array<{
    name: string;
    sheetXml: string;
    relsXml: string | null;
  }> = [];

  for (let i = 0; i < zips.length; i++) {
    const zip = zips[i];
    const sheets = await listWorkbookSheets(zip);
    if (sheets.length !== 1) {
      throw new Error(
        `Expected 1 sheet before merge, got ${sheets.length}`,
      );
    }
    const s = sheets[0];
    const relsPath = `xl/worksheets/_rels/${s.sheetFile}.rels`;
    const sstFile = zip.file("xl/sharedStrings.xml");
    const sstItems = sstFile
      ? parseSharedStringItems(await sstFile.async("string"))
      : [];
    const sstOffset = masterShared.length;
    masterShared.push(...sstItems);

    // First part owns the master styles table (offset 0). Later parts from a
    // different template must append fonts/fills/borders/cellXfs or their
    // `s="N"` indexes resolve against the wrong styles.xml.
    const stylesXml = await zip.file("xl/styles.xml")!.async("string");
    let cellXfOffset = stylesOffsetByXml.get(stylesXml);
    if (cellXfOffset === undefined) {
      cellXfOffset = appendStylesFromWorkbook(stylesState, stylesXml);
      stylesOffsetByXml.set(stylesXml, cellXfOffset);
    }

    const rawSheet = await zip.file(s.sheetPath)!.async("string");
    sheetInfos.push({
      name: parts[i].sheetName.slice(0, 31),
      sheetXml: remapSheetStyleIndexes(
        remapSheetSharedStringIndexes(rawSheet, sstOffset),
        cellXfOffset,
      ),
      relsXml: zip.file(relsPath)
        ? await zip.file(relsPath)!.async("string")
        : null,
    });
  }

  // Clear base worksheet files; rebuild from parts.
  for (const p of Object.keys(out.files)) {
    if (
      p.startsWith("xl/worksheets/") &&
      !p.endsWith("/") &&
      (p.endsWith(".xml") || p.endsWith(".rels"))
    ) {
      out.remove(p);
    }
  }

  const relLines: string[] = [];
  const sheetLines: string[] = [];
  const ctOverrides: string[] = [];
  let nextRid = 1;

  for (let i = 0; i < sheetInfos.length; i++) {
    const info = sheetInfos[i];
    const sheetId = i + 1;
    const rid = `rId${nextRid++}`;
    const destSheet = `xl/worksheets/sheet${sheetId}.xml`;
    const destRels = `xl/worksheets/_rels/sheet${sheetId}.xml.rels`;

    out.file(destSheet, info.sheetXml);
    if (info.relsXml) out.file(destRels, info.relsXml);

    sheetLines.push(
      `<sheet name="${xmlEscape(info.name)}" sheetId="${sheetId}" r:id="${rid}"/>`,
    );
    relLines.push(
      `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheetId}.xml"/>`,
    );
    ctOverrides.push(
      `<Override PartName="/xl/worksheets/sheet${sheetId}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    );
  }

  out.file("xl/sharedStrings.xml", buildSharedStringsXml(masterShared));
  out.file("xl/styles.xml", buildMergedStylesXml(stylesState));

  const firstWbXml = await zips[0].file("xl/workbook.xml")!.async("string");
  out.file(
    "xl/workbook.xml",
    firstWbXml.replace(
      /<sheets>[\s\S]*?<\/sheets>/,
      `<sheets>${sheetLines.join("")}</sheets>`,
    ),
  );

  const firstRels = await zips[0]
    .file("xl/_rels/workbook.xml.rels")!
    .async("string");
  const otherRels = [...firstRels.matchAll(/<Relationship[^>]*\/>/g)]
    .map((m) => m[0])
    .filter((line) => !line.includes("/relationships/worksheet"));

  let extraRid = nextRid;
  const remappedOther = otherRels.map((line) => {
    const id = `rId${extraRid++}`;
    return line.replace(/Id="rId\d+"/, `Id="${id}"`);
  });

  out.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `${relLines.join("")}${remappedOther.join("")}</Relationships>`,
  );

  const ct = await zips[0].file("[Content_Types].xml")!.async("string");
  let newCt = ct.replace(
    /<Override[^>]*PartName="\/xl\/worksheets\/[^"]*"[^>]*\/>/g,
    "",
  );
  newCt = newCt.replace("</Types>", `${ctOverrides.join("")}</Types>`);
  out.file("[Content_Types].xml", newCt);

  return out.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ...XLSX_ZIP_OPTIONS,
  });
}

/**
 * Build one workbook named after the division (e.g. `Division A.xlsx`).
 *
 * Expanded → "Full" sheet for every group.
 * Collapsed → "Left" for odd group indexes, "Right" for even.
 */
export async function exportBracketsToExcel(
  divisionName: string,
  brackets: BracketWithPlayers[],
  filename: string,
  clubAbbrevByName?: Map<string, string>,
  styles: BracketFillStyles = {
    idStyle: DEFAULT_POSTER.playerId,
    textStyle: DEFAULT_POSTER.playerText,
  },
  format: BracketExportFormat = "expanded",
) {
  const sorted = [...brackets].sort((a, b) => a.index - b.index);
  if (sorted.length === 0) {
    throw new Error("No brackets to export");
  }

  const missingSizes = new Set<number>();
  for (const b of sorted) {
    const map = getBracketPlayerTemplate(b.num_players);
    if (!map) {
      missingSizes.add(b.num_players);
      continue;
    }
    const layout = resolveBracketSheetLayout(map, format, b.index);
    if (layout.openingSlots.length === 0) {
      missingSizes.add(b.num_players);
    }
  }
  if (missingSizes.size) {
    const kind =
      format === "expanded"
        ? "expanded (Full)"
        : "collapsed (Left/Right)";
    throw new Error(
      `No Excel ${kind} mapping for bracket size(s): ${[...missingSizes].join(", ")}. ` +
        `Add maps in bracket_templates/sizeN.ts.`,
    );
  }

  const parts: Array<{ sheetName: string; buffer: ArrayBuffer }> = [];

  for (const b of sorted) {
    const map = getBracketPlayerTemplate(b.num_players)!;
    const layout = resolveBracketSheetLayout(map, format, b.index);
    const wb = await loadTemplateWorkbook(bracketPlayerTemplateUrl(map));
    const sheet = wb.getWorksheet(layout.sheet);
    if (!sheet) {
      throw new Error(`Worksheet "${layout.sheet}" not found in ${map.file}`);
    }

    // Storybook path: mutate template cells only — leave other sheets alone
    // so ExcelJS does not prune shared style indexes on write.
    fillBracketPlayerSheet(
      sheet,
      layout,
      toExportPlayers(b, clubAbbrevByName),
      { styles, templateFile: map.file },
    );

    const filled = await wb.xlsx.writeBuffer();
    const sheetName = `Group ${b.index}`;
    const buffer = await extractNamedSheetAsWorkbook(
      filled,
      layout.sheet,
      sheetName,
    );
    parts.push({ sheetName, buffer });
  }

  const blob = await mergeSingleSheetWorkbooks(parts);
  downloadBlob(blob, filename || `${divisionName}.xlsx`);
}

/**
 * Build one workbook named after the division (e.g. `Division A.xlsx`).
 * Team templates only fill `name` cells.
 *
 * Expanded → "Full" sheet for every group.
 * Collapsed → "Left" for odd group indexes, "Right" for even.
 */
export async function exportTeamBracketsToExcel(
  divisionName: string,
  brackets: BracketWithTeams[],
  filename: string,
  styles: BracketFillStyles = {
    textStyle: DEFAULT_POSTER.playerText,
  },
  format: BracketExportFormat = "expanded",
) {
  const sorted = [...brackets].sort((a, b) => a.index - b.index);
  if (sorted.length === 0) {
    throw new Error("No brackets to export");
  }

  const missingSizes = new Set<number>();
  for (const b of sorted) {
    const map = getBracketTeamTemplate(b.num_players);
    if (!map) {
      missingSizes.add(b.num_players);
      continue;
    }
    const layout = resolveBracketSheetLayout(map, format, b.index);
    if (layout.openingSlots.length === 0) {
      missingSizes.add(b.num_players);
    }
  }
  if (missingSizes.size) {
    const kind =
      format === "expanded"
        ? "expanded (Full)"
        : "collapsed (Left/Right)";
    throw new Error(
      `No Excel ${kind} team mapping for bracket size(s): ${[...missingSizes].join(", ")}. ` +
        `Add maps in bracket_templates/sizeN.ts (BRACKET_TEAM_TEMPLATE_N) and files under public/templates/bracket_teams/.`,
    );
  }

  const parts: Array<{ sheetName: string; buffer: ArrayBuffer }> = [];

  for (const b of sorted) {
    const map = getBracketTeamTemplate(b.num_players)!;
    const layout = resolveBracketSheetLayout(map, format, b.index);
    const wb = await loadTemplateWorkbook(bracketTeamTemplateUrl(map));
    const sheet = wb.getWorksheet(layout.sheet);
    if (!sheet) {
      throw new Error(`Worksheet "${layout.sheet}" not found in ${map.file}`);
    }

    fillBracketTeamSheet(sheet, layout, toExportTeams(b), {
      styles,
      templateFile: map.file,
    });

    const filled = await wb.xlsx.writeBuffer();
    const sheetName = `Group ${b.index}`;
    const buffer = await extractNamedSheetAsWorkbook(
      filled,
      layout.sheet,
      sheetName,
    );
    parts.push({ sheetName, buffer });
  }

  const blob = await mergeSingleSheetWorkbooks(parts);
  downloadBlob(blob, filename || `${divisionName}.xlsx`);
}
