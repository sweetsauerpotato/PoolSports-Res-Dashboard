"""
SQLAlchemy ORM model for the reservations table.
All column names use German field names as defined in the MVP PRD.
"""
from datetime import datetime, UTC
import json
from sqlalchemy import String, Integer, DateTime, Date, Text, func, Index
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class SystemSettings(Base):
    __tablename__ = "system_settings"
    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[str] = mapped_column(String, nullable=False)


class Reservation(Base):
    __tablename__ = "reservations"
    __table_args__ = (
        Index("idx_res_datum", "datum"),
        Index("idx_res_art", "art"),
        Index("idx_res_status", "status"),
        Index("idx_res_tisch_id", "tisch_id"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    datum: Mapped[str] = mapped_column(String, nullable=False)          # YYYY-MM-DD
    startzeit: Mapped[str] = mapped_column(String, nullable=False)      # YYYY-MM-DD HH:MM:SS
    endzeit: Mapped[str] = mapped_column(String, nullable=False)        # YYYY-MM-DD HH:MM:SS
    kunde: Mapped[str] = mapped_column(String, nullable=False)
    telefon: Mapped[str | None] = mapped_column(String, nullable=True)
    art: Mapped[str] = mapped_column(String, nullable=False)            # pool/snooker/dart/tt/kicker
    personen: Mapped[str] = mapped_column(String, default="2")
    standort: Mapped[str] = mapped_column(String, default="")
    csv_file: Mapped[str] = mapped_column(String, default="")
    tisch_id: Mapped[str | None] = mapped_column(String, nullable=True) # NULL until drag-drop
    status: Mapped[str] = mapped_column(String, default="unassigned")
    bemerkung: Mapped[str | None] = mapped_column(Text, nullable=True)
    tischanzahl: Mapped[int] = mapped_column(Integer, default=1)          # How many tables this group needs
    tisch_ids: Mapped[str | None] = mapped_column(Text, nullable=True)    # JSON array of assigned table IDs
    geschaetzte_dauer_minuten: Mapped[int | None] = mapped_column(Integer, nullable=True) # Used for Offenes Spiel availability projection
    erstellt_am: Mapped[str] = mapped_column(
        String, default=lambda: datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S")
    )
    erstellt_von: Mapped[str] = mapped_column(String, default="staff")

    def to_dict(self) -> dict:
        # tisch_id is computed from the JSON array for backwards compat.
        # Fallback to legacy stored column for existing rows that haven't been migrated.
        ids: list[str] = json.loads(self.tisch_ids) if self.tisch_ids else []
        primary_tisch = ids[0] if ids else self.tisch_id  # legacy fallback
        return {
            "id": self.id,
            "datum": self.datum,
            "startzeit": self.startzeit,
            "endzeit": self.endzeit,
            "kunde": self.kunde,
            "telefon": self.telefon,
            "art": self.art,
            "personen": self.personen,
            "standort": self.standort,
            "csv_file": self.csv_file,
            "tisch_id": primary_tisch,               # legacy compat — always the primary table
            "tisch_ids": ids,                         # full array for multi-table bookings
            "tischanzahl": self.tischanzahl,
            "geschaetzte_dauer_minuten": self.geschaetzte_dauer_minuten,
            "status": self.status,
            "bemerkung": self.bemerkung,
            "erstellt_am": self.erstellt_am,
            "erstellt_von": self.erstellt_von,
        }
