"""Diagnostic: list everything under the backup root."""
from pathlib import Path
import os

root = Path(os.environ.get(
    "PSL_BACKUP_DIR",
    os.environ.get("GOOGLE_DRIVE_BACKUP_PATH", "G:/My Drive/PoolSports-Backups")
))

out = []
out.append(f"ROOT: {root}")
out.append(f"EXISTS: {root.exists()}")
out.append("")

for f in sorted(root.rglob("*")):
    rel = f.relative_to(root)
    if f.is_dir():
        out.append(f"DIR  {rel}/")
    else:
        out.append(f"FILE {rel}  ({f.stat().st_size:,} bytes)")

report = Path("scripts/backup_report.txt")
report.write_text("\n".join(out), encoding="utf-8")
print(f"Written to {report.resolve()}")
