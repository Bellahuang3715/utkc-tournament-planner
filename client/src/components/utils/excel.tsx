import ExcelJS from "exceljs";
import { PlayerFieldTypes, FieldInsertable } from "../../interfaces/player_fields";

export type HeaderMapEntry = { col: number; header: string };

export async function inferFieldsFromSheet(
  file: File,
  sheetName: string,
  headerRow: number
): Promise<{
  fields: FieldInsertable[];
  headerMap: HeaderMapEntry[];
}> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.getWorksheet(sheetName);
  if (!ws) throw new Error(`Sheet "${sheetName}" not found`);

  // build the headerMap
  const rawHeader = ws.getRow(headerRow).values as any[];
  const headerMap: HeaderMapEntry[] = [];
  for (let col = 1; col < rawHeader.length; col++) {
    const val = rawHeader[col];
    if (val != null && String(val).trim()) {
      headerMap.push({ col, header: String(val).trim() });
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
      (cell.value && typeof cell.value === "object" && "formula" in cell.value) ||
      typeof cell.value === "number"
    ) {
      type = "NUMBER";
    }

    return {
      key:      header.toLowerCase().replace(/\s+/g, "_"),
      label:    header,
      include:  true,
      type,
      options,
      position: idx,
    };
  });

  return { fields, headerMap };
}
