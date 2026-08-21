export const getRowIndex = (row: string): number => {
  let index = 0;
  for (let i = 0; i < row.length; i++) {
    index = index * 26 + (row.charCodeAt(i) - 64);
  }
  return index - 1;
};

export const getLogicalRowOrder = (rows: string[]): string[] => {
  return [...new Set(rows)].sort((a, b) => getRowIndex(a) - getRowIndex(b));
};

export const getVisualRowOrder = (rows: string[]): string[] => {
  return getLogicalRowOrder(rows);
};

export const groupSeatsByRow = <T extends { row: string }>(items: T[]): Record<string, T[]> => {
  const grouped: Record<string, T[]> = {};

  items.forEach((item) => {
    if (!grouped[item.row]) {
      grouped[item.row] = [];
    }
    grouped[item.row].push(item);
  });

  return grouped;
};
