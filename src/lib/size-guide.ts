// SizeGuideTranslation.content is plain text. Lines starting with "|" are
// table rows (cells separated by "|", first row = header); every other
// non-empty line is a note paragraph. Rendered with React (no raw HTML).
export type SizeGuideContent = { table: string[][]; notes: string[] };

export function parseSizeGuide(content: string): SizeGuideContent {
  const table: string[][] = [];
  const notes: string[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("|")) {
      table.push(
        line
          .split("|")
          .slice(1, line.endsWith("|") ? -1 : undefined)
          .map((cell) => cell.trim()),
      );
    } else {
      notes.push(line);
    }
  }
  return { table, notes };
}
