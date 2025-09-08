import ExcelJS from "exceljs";
import { PlayerFieldTypes, FieldInsertable } from "../../interfaces/player_fields";

export type HeaderMapEntry = { col: number; header: string };

// normalize: remove non-alphanumerics, lowercase
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// headers to skip (normalized)
// don't create fields for names, since we always have a name field
const SKIP_HEADERS = new Set([
  "name",
  "firstname",
  "lastname",
  "fullname",
  "first",
  "last",
  "givenname",
  "familyname",
  "surname",
  "playername",
]);

const shouldSkip = (h: string) => SKIP_HEADERS.has(norm(h));

export type NameCols = { name?: number; first?: number; last?: number };

export async function inferFieldsFromSheet(
  file: File,
  sheetName: string,
  headerRow: number
): Promise<{
  fields: FieldInsertable[];
  headerMap: HeaderMapEntry[];
  nameCols: NameCols;
}> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.getWorksheet(sheetName);
  if (!ws) throw new Error(`Sheet "${sheetName}" not found`);

  // build the headerMap
  const rawHeader = ws.getRow(headerRow).values as any[];
  const headerMap: HeaderMapEntry[] = [];
  const nameCols: NameCols = {};

  for (let col = 1; col < rawHeader.length; col++) {
    const val = rawHeader[col];
    const header = val != null ? String(val).trim() : "";
    if (!header) continue;

    const hNorm = norm(header);
    // detect name-ish columns (prefer a single "name"/"full name"; otherwise firstlast)
    if (hNorm === "name" || hNorm === "fullname") {
      nameCols.name = col;
      continue; // don't include in data fields
    }
    if (hNorm === "firstname" || hNorm === "first" || hNorm === "givenname") {
      nameCols.first = col;
      continue; // don't include in data fields
    }
    if (
      hNorm === "lastname" ||
      hNorm === "last" ||
      hNorm === "familyname" ||
      hNorm === "surname"
    ) {
      nameCols.last = col;
      continue; // don't include in data fields
    }

    // skip blank headers or ones in the skip list
    if (!shouldSkip(header)) {
      headerMap.push({ col, header });
    }
  }

  // turn that into a list of FieldInsertables
  const fields: FieldInsertable[] = headerMap.map(({ col, header }, idx) => {
    // peek two rows down for a dropdown validation
    const cell = ws.getRow(headerRow + 2).getCell(col);
    // detect type...
    let type: PlayerFieldTypes = "TEXT";
    let options: string[] = [];

    // dropdown?
    if (
      cell.dataValidation?.type === "list" &&
      Array.isArray(cell.dataValidation.formulae)
    ) {
      type = "DROPDOWN";
      const formula = cell.dataValidation.formulae[0] as string;
      if (formula.startsWith('"') && formula.endsWith('"')) {
        options = formula.slice(1, -1).split(",");
      }
    }
    // boolean?
    else if (typeof cell.value === "boolean") {
      type = "CHECKBOX";
    }
    // formula or numeric?
    else if (
      (cell.value &&
        typeof cell.value === "object" &&
        "formula" in cell.value) ||
      typeof cell.value === "number"
    ) {
      type = "NUMBER";
    }

    return {
      key: header.toLowerCase().replace(/\s+/g, "_"),
      label: header,
      include: true,
      type,
      options,
      position: idx,
    };
  });

  return { fields, headerMap, nameCols };
}
