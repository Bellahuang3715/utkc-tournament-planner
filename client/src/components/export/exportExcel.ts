// components/export/exportExcel.ts
import * as XLSX from "xlsx";
import { BracketWithPlayers } from "../../interfaces/bracket";

export function exportBracketsToExcel(
  divisionName: string,
  brackets: BracketWithPlayers[],
  filename: string,
) {
  // One sheet for all players (simple + useful)
  const rows: Array<Record<string, any>> = [];

  const sorted = [...brackets].sort((a, b) => a.index - b.index);

  for (const b of sorted) {
    for (const slot of b.players) {
      rows.push({
        group_index: b.index,
        group_title: b.title ?? "",
        bracket_id: b.id,
        slot_bracket_idx: slot.bracket_idx,
        player_id: slot.player_id,
        code: slot.code ?? "",
        name: slot.name ?? "",
        club: slot.club ?? "", // (this can be abbrev if you already mapped it)
      });
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "players");

  // Optional: add a metadata sheet
  const meta = XLSX.utils.json_to_sheet([{ division: divisionName }]);
  XLSX.utils.book_append_sheet(wb, meta, "meta");

  XLSX.writeFile(wb, filename);
}