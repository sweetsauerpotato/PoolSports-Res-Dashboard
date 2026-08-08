import { TableDefinition, TableType, Floor } from '../types'

// ===================== EG (Erdgeschoss / Ground Floor) =====================
// Grid: ~14 cols x 12 rows
// Layout from image: Tresen left strip, Gastro left-center, Pool center,
// Snooker center-top, TT top, Darts bottom-right, Kicker top-right

export const EG_TABLES: TableDefinition[] = [
  // ── Kicker 200 (row 1, cols 1-2, colSpan:2 — sits above both TT columns) ──
  { id: 'Kicker-200', type: TableType.Kicker, floor: Floor.EG, label: 'Kicker 200', gridRow: 1, gridCol: 1, colSpan: 2 },

  // ── TT (cols 1-2, rowSpan:2, starting at row 2 below Kicker) ─────────────
  { id: 'TT-47', type: TableType.TT, floor: Floor.EG, label: 'TT 47', gridRow: 2, gridCol: 1, rowSpan: 2 },
  { id: 'TT-43', type: TableType.TT, floor: Floor.EG, label: 'TT 43', gridRow: 2, gridCol: 2, rowSpan: 2 },
  { id: 'TT-46', type: TableType.TT, floor: Floor.EG, label: 'TT 46', gridRow: 4, gridCol: 1, rowSpan: 2 },
  { id: 'TT-42', type: TableType.TT, floor: Floor.EG, label: 'TT 42', gridRow: 4, gridCol: 2, rowSpan: 2 },
  { id: 'TT-45', type: TableType.TT, floor: Floor.EG, label: 'TT 45', gridRow: 6, gridCol: 1, rowSpan: 2 },
  { id: 'TT-41', type: TableType.TT, floor: Floor.EG, label: 'TT 41', gridRow: 6, gridCol: 2, rowSpan: 2 },
  { id: 'TT-44', type: TableType.TT, floor: Floor.EG, label: 'TT 44', gridRow: 8, gridCol: 1, rowSpan: 2 },
  { id: 'TT-40', type: TableType.TT, floor: Floor.EG, label: 'TT 40', gridRow: 8, gridCol: 2, rowSpan: 2 },

  // ── Snooker (col 3, rowSpan:2, from row 1 — fills rows 1-10) ─────────────
  { id: 'Snooker-34', type: TableType.Snooker, floor: Floor.EG, label: 'Snooker 34', gridRow: 1, gridCol: 3, rowSpan: 2 },
  { id: 'Snooker-33', type: TableType.Snooker, floor: Floor.EG, label: 'Snooker 33', gridRow: 3, gridCol: 3, rowSpan: 2 },
  { id: 'Snooker-32', type: TableType.Snooker, floor: Floor.EG, label: 'Snooker 32', gridRow: 5, gridCol: 3, rowSpan: 2 },
  { id: 'Snooker-31', type: TableType.Snooker, floor: Floor.EG, label: 'Snooker 31', gridRow: 7, gridCol: 3, rowSpan: 2 },
  { id: 'Snooker-30', type: TableType.Snooker, floor: Floor.EG, label: 'Snooker 30', gridRow: 9, gridCol: 3, rowSpan: 2 },

  // ── Pool 20-26 (cols 4-6, colSpan:3, rows 1-7) ───────────────────────────
  // colSpan:3 absorbs the former dead col 6; both Pool groups share identical card dimensions
  { id: 'Pool-26', type: TableType.Pool, floor: Floor.EG, label: 'Pool 26', gridRow: 1, gridCol: 4, colSpan: 3 },
  { id: 'Pool-25', type: TableType.Pool, floor: Floor.EG, label: 'Pool 25', gridRow: 2, gridCol: 4, colSpan: 3 },
  { id: 'Pool-24', type: TableType.Pool, floor: Floor.EG, label: 'Pool 24', gridRow: 3, gridCol: 4, colSpan: 3 },
  { id: 'Pool-23', type: TableType.Pool, floor: Floor.EG, label: 'Pool 23', gridRow: 4, gridCol: 4, colSpan: 3 },
  { id: 'Pool-22', type: TableType.Pool, floor: Floor.EG, label: 'Pool 22', gridRow: 5, gridCol: 4, colSpan: 3 },
  { id: 'Pool-21', type: TableType.Pool, floor: Floor.EG, label: 'Pool 21', gridRow: 6, gridCol: 4, colSpan: 3 },
  { id: 'Pool-20', type: TableType.Pool, floor: Floor.EG, label: 'Pool 20', gridRow: 7, gridCol: 4, colSpan: 3 },

  // ── Pool 10-18 (cols 7-9, colSpan:3, rows 1-9) ───────────────────────────
  // Pool 18 at row 2 — immediately after Pool 17; colSpan:3 absorbs former dead col 9
  { id: 'Pool-17', type: TableType.Pool, floor: Floor.EG, label: 'Pool 17', gridRow: 1, gridCol: 7, colSpan: 3 },
  { id: 'Pool-18', type: TableType.Pool, floor: Floor.EG, label: 'Pool 18', gridRow: 2, gridCol: 7, colSpan: 3 },
  { id: 'Pool-16', type: TableType.Pool, floor: Floor.EG, label: 'Pool 16', gridRow: 3, gridCol: 7, colSpan: 3 },
  { id: 'Pool-15', type: TableType.Pool, floor: Floor.EG, label: 'Pool 15', gridRow: 4, gridCol: 7, colSpan: 3 },
  { id: 'Pool-14', type: TableType.Pool, floor: Floor.EG, label: 'Pool 14', gridRow: 5, gridCol: 7, colSpan: 3 },
  { id: 'Pool-13', type: TableType.Pool, floor: Floor.EG, label: 'Pool 13', gridRow: 6, gridCol: 7, colSpan: 3 },
  { id: 'Pool-12', type: TableType.Pool, floor: Floor.EG, label: 'Pool 12', gridRow: 7, gridCol: 7, colSpan: 3 },
  { id: 'Pool-11', type: TableType.Pool, floor: Floor.EG, label: 'Pool 11', gridRow: 8, gridCol: 7, colSpan: 3 },
  { id: 'Pool-10', type: TableType.Pool, floor: Floor.EG, label: 'Pool 10', gridRow: 9, gridCol: 7, colSpan: 3 },

  // ── Dart 1-5 (col 10, rows 1-5) ──────────────────────────────────────────
  { id: 'Dart-5', type: TableType.Dart, floor: Floor.EG, label: 'Dart 5', gridRow: 1, gridCol: 10 },
  { id: 'Dart-4', type: TableType.Dart, floor: Floor.EG, label: 'Dart 4', gridRow: 2, gridCol: 10 },
  { id: 'Dart-3', type: TableType.Dart, floor: Floor.EG, label: 'Dart 3', gridRow: 3, gridCol: 10 },
  { id: 'Dart-2', type: TableType.Dart, floor: Floor.EG, label: 'Dart 2', gridRow: 4, gridCol: 10 },
  { id: 'Dart-1', type: TableType.Dart, floor: Floor.EG, label: 'Dart 1', gridRow: 5, gridCol: 10 },

  // ── Gastro 70-72 (col 10, rowSpan:2 each — fills rows 6-11, no dead space) ─
  { id: 'Gastro-70', type: TableType.Gastro, floor: Floor.EG, label: 'Gastro 70', gridRow: 6,  gridCol: 10, rowSpan: 2 },
  { id: 'Gastro-71', type: TableType.Gastro, floor: Floor.EG, label: 'Gastro 71', gridRow: 8,  gridCol: 10, rowSpan: 2 },
  { id: 'Gastro-72', type: TableType.Gastro, floor: Floor.EG, label: 'Gastro 72', gridRow: 10, gridCol: 10, rowSpan: 2 },

  // ── Gastro 60-69 (bottom row 12, all 10 cols) ─────────────────────────────
  { id: 'Gastro-60', type: TableType.Gastro, floor: Floor.EG, label: 'Gastro 60', gridRow: 12, gridCol: 1  },
  { id: 'Gastro-61', type: TableType.Gastro, floor: Floor.EG, label: 'Gastro 61', gridRow: 12, gridCol: 2  },
  { id: 'Gastro-62', type: TableType.Gastro, floor: Floor.EG, label: 'Gastro 62', gridRow: 12, gridCol: 3  },
  { id: 'Gastro-63', type: TableType.Gastro, floor: Floor.EG, label: 'Gastro 63', gridRow: 12, gridCol: 4  },
  { id: 'Gastro-64', type: TableType.Gastro, floor: Floor.EG, label: 'Gastro 64', gridRow: 12, gridCol: 5  },
  { id: 'Gastro-65', type: TableType.Gastro, floor: Floor.EG, label: 'Gastro 65', gridRow: 12, gridCol: 6  },
  { id: 'Gastro-66', type: TableType.Gastro, floor: Floor.EG, label: 'Gastro 66', gridRow: 12, gridCol: 7  },
  { id: 'Gastro-67', type: TableType.Gastro, floor: Floor.EG, label: 'Gastro 67', gridRow: 12, gridCol: 8  },
  { id: 'Gastro-68', type: TableType.Gastro, floor: Floor.EG, label: 'Gastro 68', gridRow: 12, gridCol: 9  },
  { id: 'Gastro-69', type: TableType.Gastro, floor: Floor.EG, label: 'Gastro 69', gridRow: 12, gridCol: 10 },
]

// ===================== UG (Untergeschoss / Lower Floor) =====================
// Grid: ~14 cols x 12 rows
// Layout from image: Tresen + controls left, Kicker top-left,
// Gastro left-center columns, TT top, Pool center grid, Darts bottom-left

export const UG_TABLES: TableDefinition[] = [
  // ── Kicker 203 (row 1, col 1 — above TT zone) ─────────────────────────────
  { id: 'Kicker-203', type: TableType.Kicker, floor: Floor.UG, label: 'Kicker 203', gridRow: 1, gridCol: 1 },

  // ── TT (col 1, rowSpan:2, rows 2-11 — 5 tables fill col 1) ───────────────
  { id: 'TT-144', type: TableType.TT, floor: Floor.UG, label: 'TT 144', gridRow: 2,  gridCol: 1, rowSpan: 2 },
  { id: 'TT-143', type: TableType.TT, floor: Floor.UG, label: 'TT 143', gridRow: 4,  gridCol: 1, rowSpan: 2 },
  { id: 'TT-142', type: TableType.TT, floor: Floor.UG, label: 'TT 142', gridRow: 6,  gridCol: 1, rowSpan: 2 },
  { id: 'TT-141', type: TableType.TT, floor: Floor.UG, label: 'TT 141', gridRow: 8,  gridCol: 1, rowSpan: 2 },
  { id: 'TT-140', type: TableType.TT, floor: Floor.UG, label: 'TT 140', gridRow: 10, gridCol: 1, rowSpan: 2 },

  // ── Gastro 170-179 (col 2, rows 1-10 — 179 at top → 170 at bottom = ascending bottom→top) ─
  { id: 'Gastro-179', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 179', gridRow: 1,  gridCol: 2 },
  { id: 'Gastro-178', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 178', gridRow: 2,  gridCol: 2 },
  { id: 'Gastro-177', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 177', gridRow: 3,  gridCol: 2 },
  { id: 'Gastro-176', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 176', gridRow: 4,  gridCol: 2 },
  { id: 'Gastro-175', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 175', gridRow: 5,  gridCol: 2 },
  { id: 'Gastro-174', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 174', gridRow: 6,  gridCol: 2 },
  { id: 'Gastro-173', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 173', gridRow: 7,  gridCol: 2 },
  { id: 'Gastro-172', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 172', gridRow: 8,  gridCol: 2 },
  { id: 'Gastro-171', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 171', gridRow: 9,  gridCol: 2 },
  { id: 'Gastro-170', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 170', gridRow: 10, gridCol: 2 },

  // ── Pool 130-138 (cols 3-4, colSpan:2, rows 1-9 — 138 at top → 130 at bottom = ascending bottom→top) ─
  { id: 'Pool-138', type: TableType.Pool, floor: Floor.UG, label: 'Pool 138', gridRow: 1, gridCol: 3, colSpan: 2 },
  { id: 'Pool-137', type: TableType.Pool, floor: Floor.UG, label: 'Pool 137', gridRow: 2, gridCol: 3, colSpan: 2 },
  { id: 'Pool-136', type: TableType.Pool, floor: Floor.UG, label: 'Pool 136', gridRow: 3, gridCol: 3, colSpan: 2 },
  { id: 'Pool-135', type: TableType.Pool, floor: Floor.UG, label: 'Pool 135', gridRow: 4, gridCol: 3, colSpan: 2 },
  { id: 'Pool-134', type: TableType.Pool, floor: Floor.UG, label: 'Pool 134', gridRow: 5, gridCol: 3, colSpan: 2 },
  { id: 'Pool-133', type: TableType.Pool, floor: Floor.UG, label: 'Pool 133', gridRow: 6, gridCol: 3, colSpan: 2 },
  { id: 'Pool-132', type: TableType.Pool, floor: Floor.UG, label: 'Pool 132', gridRow: 7, gridCol: 3, colSpan: 2 },
  { id: 'Pool-131', type: TableType.Pool, floor: Floor.UG, label: 'Pool 131', gridRow: 8, gridCol: 3, colSpan: 2 },
  { id: 'Pool-130', type: TableType.Pool, floor: Floor.UG, label: 'Pool 130', gridRow: 9, gridCol: 3, colSpan: 2 },

  // ── Pool 120-126 (cols 5-6, colSpan:2, rows 1-7 — 126 at top → 120 at bottom = ascending bottom→top) ─
  { id: 'Pool-126', type: TableType.Pool, floor: Floor.UG, label: 'Pool 126', gridRow: 1, gridCol: 5, colSpan: 2 },
  { id: 'Pool-125', type: TableType.Pool, floor: Floor.UG, label: 'Pool 125', gridRow: 2, gridCol: 5, colSpan: 2 },
  { id: 'Pool-124', type: TableType.Pool, floor: Floor.UG, label: 'Pool 124', gridRow: 3, gridCol: 5, colSpan: 2 },
  { id: 'Pool-123', type: TableType.Pool, floor: Floor.UG, label: 'Pool 123', gridRow: 4, gridCol: 5, colSpan: 2 },
  { id: 'Pool-122', type: TableType.Pool, floor: Floor.UG, label: 'Pool 122', gridRow: 5, gridCol: 5, colSpan: 2 },
  { id: 'Pool-121', type: TableType.Pool, floor: Floor.UG, label: 'Pool 121', gridRow: 6, gridCol: 5, colSpan: 2 },
  { id: 'Pool-120', type: TableType.Pool, floor: Floor.UG, label: 'Pool 120', gridRow: 7, gridCol: 5, colSpan: 2 },

  // ── Pool 110-115 (cols 7-8, colSpan:2, rows 1-6 — 115 at top → 110 at bottom = ascending bottom→top) ─
  { id: 'Pool-115', type: TableType.Pool, floor: Floor.UG, label: 'Pool 115', gridRow: 1, gridCol: 7, colSpan: 2 },
  { id: 'Pool-114', type: TableType.Pool, floor: Floor.UG, label: 'Pool 114', gridRow: 2, gridCol: 7, colSpan: 2 },
  { id: 'Pool-113', type: TableType.Pool, floor: Floor.UG, label: 'Pool 113', gridRow: 3, gridCol: 7, colSpan: 2 },
  { id: 'Pool-112', type: TableType.Pool, floor: Floor.UG, label: 'Pool 112', gridRow: 4, gridCol: 7, colSpan: 2 },
  { id: 'Pool-111', type: TableType.Pool, floor: Floor.UG, label: 'Pool 111', gridRow: 5, gridCol: 7, colSpan: 2 },
  { id: 'Pool-110', type: TableType.Pool, floor: Floor.UG, label: 'Pool 110', gridRow: 6, gridCol: 7, colSpan: 2 },

  // ── Lounge 180-182 (cols 9-10, colSpan:2, rows 1-3 — 182 at top → 180 at bottom = ascending bottom→top) ─
  { id: 'Lounge-182', type: TableType.Lounge, floor: Floor.UG, label: 'Lounge 182', gridRow: 1, gridCol: 9, colSpan: 2 },
  { id: 'Lounge-181', type: TableType.Lounge, floor: Floor.UG, label: 'Lounge 181', gridRow: 2, gridCol: 9, colSpan: 2 },
  { id: 'Lounge-180', type: TableType.Lounge, floor: Floor.UG, label: 'Lounge 180', gridRow: 3, gridCol: 9, colSpan: 2 },

  // ── Dart 100-103 (2×2 grid, cols 7-10, rows 8-11, colSpan:2 rowSpan:2 — large readable cards) ─
  // Top row (rows 8-9): higher numbers 102 left, 103 right
  // Bottom row (rows 10-11): lower numbers 100 left, 101 right
  // = ascending 100→103 bottom-left → bottom-right → top-left → top-right ✓
  { id: 'Dart-103', type: TableType.Dart, floor: Floor.UG, label: 'Dart 103', gridRow: 8,  gridCol: 9, colSpan: 2, rowSpan: 2 },
  { id: 'Dart-102', type: TableType.Dart, floor: Floor.UG, label: 'Dart 102', gridRow: 8,  gridCol: 7, colSpan: 2, rowSpan: 2 },
  { id: 'Dart-101', type: TableType.Dart, floor: Floor.UG, label: 'Dart 101', gridRow: 10, gridCol: 9, colSpan: 2, rowSpan: 2 },
  { id: 'Dart-100', type: TableType.Dart, floor: Floor.UG, label: 'Dart 100', gridRow: 10, gridCol: 7, colSpan: 2, rowSpan: 2 },

  // ── Gastro 160-169 (bottom row 12, all 10 cols — sequential 160 → 169) ────
  { id: 'Gastro-160', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 160', gridRow: 12, gridCol: 1  },
  { id: 'Gastro-161', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 161', gridRow: 12, gridCol: 2  },
  { id: 'Gastro-162', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 162', gridRow: 12, gridCol: 3  },
  { id: 'Gastro-163', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 163', gridRow: 12, gridCol: 4  },
  { id: 'Gastro-164', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 164', gridRow: 12, gridCol: 5  },
  { id: 'Gastro-165', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 165', gridRow: 12, gridCol: 6  },
  { id: 'Gastro-166', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 166', gridRow: 12, gridCol: 7  },
  { id: 'Gastro-167', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 167', gridRow: 12, gridCol: 8  },
  { id: 'Gastro-168', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 168', gridRow: 12, gridCol: 9  },
  { id: 'Gastro-169', type: TableType.Gastro, floor: Floor.UG, label: 'Gastro 169', gridRow: 12, gridCol: 10 },
]

// ===================== VRA (Veranstaltungsraum / Event Room) =====================
// Grid: ~10 cols x 8 rows
// Layout from image: Darts top and bottom-left, Kicker left,
// Gastro center + right

export const VRA_TABLES: TableDefinition[] = [
  // Dart 37-39 (top row)
  { id: 'Dart-37', type: TableType.Dart, floor: Floor.VRA, label: 'Dart 37', gridRow: 8, gridCol: 1 },
  { id: 'Dart-38', type: TableType.Dart, floor: Floor.VRA, label: 'Dart 38', gridRow: 6, gridCol: 1 },
  { id: 'Dart-39', type: TableType.Dart, floor: Floor.VRA, label: 'Dart 39', gridRow: 4, gridCol: 1 },

  // Gastro 106 + Dart area top
  { id: 'Gastro-106', type: TableType.Gastro, floor: Floor.VRA, label: 'Gastro 106', gridRow: 5, gridCol: 2 },
  { id: 'Gastro-105', type: TableType.Gastro, floor: Floor.VRA, label: 'Gastro 105', gridRow: 4, gridCol: 2 },
  { id: 'Gastro-104', type: TableType.Gastro, floor: Floor.VRA, label: 'Gastro 104', gridRow: 2, gridCol: 2 },
  { id: 'Gastro-107', type: TableType.Gastro, floor: Floor.VRA, label: 'Gastro 107', gridRow: 9, gridCol: 1 },

  // Gastro 103 + 102 (right column)
  { id: 'Gastro-103', type: TableType.Gastro, floor: Floor.VRA, label: 'Gastro 103', gridRow: 1, gridCol: 3 },
  { id: 'Gastro-102', type: TableType.Gastro, floor: Floor.VRA, label: 'Gastro 102', gridRow: 1, gridCol: 4 },

  // Gastro 90-92 (center area)
  { id: 'Gastro-90', type: TableType.Gastro, floor: Floor.VRA, label: 'Gastro 90', gridRow: 6, gridCol: 4 },
  { id: 'Gastro-91', type: TableType.Gastro, floor: Floor.VRA, label: 'Gastro 91', gridRow: 5, gridCol: 4 },
  { id: 'Gastro-92', type: TableType.Gastro, floor: Floor.VRA, label: 'Gastro 92', gridRow: 3, gridCol: 3 },

  // Kicker 201, 202 (left side)
  { id: 'Kicker-201', type: TableType.Kicker, floor: Floor.VRA, label: 'Kicker 201', gridRow: 9, gridCol: 4 },
  { id: 'Kicker-202', type: TableType.Kicker, floor: Floor.VRA, label: 'Kicker 202', gridRow: 9, gridCol: 5 },

  // Gastro 93-95 (middle rows)
  { id: 'Gastro-93', type: TableType.Gastro, floor: Floor.VRA, label: 'Gastro 93', gridRow: 6, gridCol: 5 },
  { id: 'Gastro-94', type: TableType.Gastro, floor: Floor.VRA, label: 'Gastro 94', gridRow: 5, gridCol: 5 },
  { id: 'Gastro-95', type: TableType.Gastro, floor: Floor.VRA, label: 'Gastro 95', gridRow: 3, gridCol: 5 },
  { id: 'Gastro-100', type: TableType.Gastro, floor: Floor.VRA, label: 'Gastro 100', gridRow: 1, gridCol: 5 },
  { id: 'Gastro-101', type: TableType.Gastro, floor: Floor.VRA, label: 'Gastro 101', gridRow: 2, gridCol: 4 },

  // Gastro 96-99 (bottom area)
  { id: 'Gastro-96', type: TableType.Gastro, floor: Floor.VRA, label: 'Gastro 96', gridRow: 6, gridCol: 7 },
  { id: 'Gastro-97', type: TableType.Gastro, floor: Floor.VRA, label: 'Gastro 97', gridRow: 4, gridCol: 7 },
  { id: 'Gastro-98', type: TableType.Gastro, floor: Floor.VRA, label: 'Gastro 98', gridRow: 3, gridCol: 7 },
  { id: 'Gastro-99', type: TableType.Gastro, floor: Floor.VRA, label: 'Gastro 99', gridRow: 2, gridCol: 6 },

  // Dart 7-9 (bottom-left)
  { id: 'Dart-7', type: TableType.Dart, floor: Floor.VRA, label: 'Dart 7', gridRow: 9, gridCol: 7 },
  { id: 'Dart-8', type: TableType.Dart, floor: Floor.VRA, label: 'Dart 8', gridRow: 8, gridCol: 7 },
  { id: 'Dart-9', type: TableType.Dart, floor: Floor.VRA, label: 'Dart 9', gridRow: 7, gridCol: 7 },
]

// ===================== Combined Exports =====================

export const ALL_TABLES: TableDefinition[] = [...EG_TABLES, ...UG_TABLES, ...VRA_TABLES]

export const TABLES_BY_FLOOR: Record<Floor, TableDefinition[]> = {
  [Floor.EG]: EG_TABLES,
  [Floor.UG]: UG_TABLES,
  [Floor.VRA]: VRA_TABLES,
}

export const TABLE_MAP: Record<string, TableDefinition> = Object.fromEntries(
  ALL_TABLES.map((t) => [t.id, t])
)

export const FLOOR_GRID_SIZES: Record<Floor, { cols: number; rows: number }> = {
  [Floor.EG]: { cols: 10, rows: 12 },
  [Floor.UG]: { cols: 10, rows: 12 },
  [Floor.VRA]: { cols: 7, rows: 9 },
}
