from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, extract
from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel
import pandas as pd
import io
import csv
import json
from models import User, UserRole, TimeEntry, TimeEntryType, WorkTimeSubtype, ChildCount, GlobalEvent
from auth import get_current_active_user, get_db

router = APIRouter()

class ExportRequest(BaseModel):
    start_date: date
    end_date: date
    user_ids: Optional[List[int]] = None
    export_type: str = "time_entries"  # "time_entries", "child_counts", "global_events"
    format: str = "csv"  # "csv", "excel"

@router.post("/export")
async def export_data(
    export_req: ExportRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Daten als CSV oder Excel exportieren
    """
    # Nur Leitung und Admin können exportieren
    if current_user.role == UserRole.FACHKRAFT:
        raise HTTPException(status_code=403, detail="Keine Berechtigung für Export")
    
    if export_req.export_type == "time_entries":
        return await export_time_entries(export_req, current_user, db)
    elif export_req.export_type == "child_counts":
        return await export_child_counts(export_req, current_user, db)
    elif export_req.export_type == "global_events":
        return await export_global_events(export_req, current_user, db)
    else:
        raise HTTPException(status_code=400, detail="Ungültiger Export-Typ")

async def export_time_entries(export_req: ExportRequest, current_user: User, db: Session):
    """
    Zeiterfassung exportieren
    """
    query = db.query(TimeEntry, User.full_name).join(User)
    
    # Filter anwenden
    query = query.filter(
        and_(
            TimeEntry.date >= export_req.start_date,
            TimeEntry.date <= export_req.end_date
        )
    )
    
    if export_req.user_ids:
        query = query.filter(TimeEntry.user_id.in_(export_req.user_ids))
    
    results = query.order_by(TimeEntry.date, User.full_name).all()
    
    # Daten für Export vorbereiten
    export_data = []
    for entry, user_name in results:
        export_data.append({
            'Datum': entry.date.strftime('%Y-%m-%d'),
            'Mitarbeiter': user_name,
            'Typ': entry.entry_type.value,
            'Untertyp': entry.subtype.value if entry.subtype else '',
            'Stunden': entry.hours,
            'Vorbereitungszeit (auto)': entry.prep_time_hours,
            'Gesamtstunden': entry.total_hours,
            'Tage': entry.days,
            'Beschreibung': entry.description or '',
            'Gesperrt': 'Ja' if entry.is_locked else 'Nein',
            'Erstellt': entry.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    df = pd.DataFrame(export_data)
    
    if export_req.format == "excel":
        return export_to_excel(df, f"zeiterfassung_{export_req.start_date}_{export_req.end_date}")
    else:
        return export_to_csv(df, f"zeiterfassung_{export_req.start_date}_{export_req.end_date}")

async def export_child_counts(export_req: ExportRequest, current_user: User, db: Session):
    """
    Kinderanzahl exportieren
    """
    query = db.query(ChildCount).filter(
        and_(
            ChildCount.date >= export_req.start_date,
            ChildCount.date <= export_req.end_date
        )
    ).order_by(ChildCount.date, ChildCount.time_slot)
    
    results = query.all()
    
    export_data = []
    for count in results:
        # Personalbedarfsberechnung
        required_staff_under_3 = max(1, round(count.under_3_count / 4.25)) if count.under_3_count > 0 else 0
        required_staff_over_3 = max(1, round(count.over_3_count / 10)) if count.over_3_count > 0 else 0
        
        export_data.append({
            'Datum': count.date.strftime('%Y-%m-%d'),
            'Zeitslot': count.time_slot,
            'Unter 3 Jahre': count.under_3_count,
            'Über 3 Jahre': count.over_3_count,
            'Gesamt Kinder': count.under_3_count + count.over_3_count,
            'Personal U3 (benötigt)': required_staff_under_3,
            'Personal Ü3 (benötigt)': required_staff_over_3,
            'Personal Gesamt (benötigt)': required_staff_under_3 + required_staff_over_3,
            'Erstellt': count.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    df = pd.DataFrame(export_data)
    
    if export_req.format == "excel":
        return export_to_excel(df, f"kinderanzahl_{export_req.start_date}_{export_req.end_date}")
    else:
        return export_to_csv(df, f"kinderanzahl_{export_req.start_date}_{export_req.end_date}")

async def export_global_events(export_req: ExportRequest, current_user: User, db: Session):
    """
    Globale Events exportieren
    """
    query = db.query(GlobalEvent).filter(
        and_(
            GlobalEvent.date >= export_req.start_date,
            GlobalEvent.date <= export_req.end_date
        )
    ).order_by(GlobalEvent.date)
    
    results = query.all()
    
    EVENT_TYPE_LABELS = {
        "early_closure_staff": "Früher Betriebsschluss (Personalmangel)",
        "early_closure_event": "Früher Betriebsschluss (Event)",
        "closure": "Schließtag",
        "team_development": "Teamentwicklung",
        "staff_meeting": "Personalversammlung",
        "maintenance": "Wartung/Renovierung",
        "holiday": "Feiertag",
        "other": "Sonstiges"
    }
    
    export_data = []
    for event in results:
        export_data.append({
            'Datum': event.date.strftime('%Y-%m-%d'),
            'Event-Typ': event.event_type,
            'Event-Bezeichnung': EVENT_TYPE_LABELS.get(event.event_type, event.event_type),
            'Beschreibung': event.description or '',
            'Erstellt': event.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    df = pd.DataFrame(export_data)
    
    if export_req.format == "excel":
        return export_to_excel(df, f"events_{export_req.start_date}_{export_req.end_date}")
    else:
        return export_to_csv(df, f"events_{export_req.start_date}_{export_req.end_date}")

def export_to_csv(df: pd.DataFrame, filename: str):
    """
    DataFrame als CSV exportieren
    """
    output = io.StringIO()
    df.to_csv(output, index=False, encoding='utf-8', sep=';')
    output.seek(0)
    
    response = StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}.csv"
        }
    )
    return response

def export_to_excel(df: pd.DataFrame, filename: str):
    """
    DataFrame als Excel exportieren
    """
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Daten')
        
        # Formatierung
        workbook = writer.book
        worksheet = writer.sheets['Daten']
        
        # Spaltenbreite automatisch anpassen
        for column in worksheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            worksheet.column_dimensions[column_letter].width = adjusted_width
    
    output.seek(0)
    
    response = StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}.xlsx"
        }
    )
    return response

class ImportResult(BaseModel):
    success: bool
    imported_count: int
    errors: List[str]
    warnings: List[str]

@router.post("/import/time-entries", response_model=ImportResult)
async def import_time_entries(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Zeiterfassung aus CSV/Excel importieren
    """
    if current_user.role == UserRole.FACHKRAFT:
        raise HTTPException(status_code=403, detail="Keine Berechtigung für Import")
    
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Nur CSV und Excel-Dateien erlaubt")
    
    try:
        # Datei lesen
        contents = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')), sep=';')
        else:
            df = pd.read_excel(io.BytesIO(contents))
        
        # Spalten validieren
        required_columns = ['Datum', 'Mitarbeiter', 'Typ', 'Stunden']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Fehlende Spalten: {', '.join(missing_columns)}"
            )
        
        # Import durchführen
        result = await process_time_entries_import(df, current_user, db)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import-Fehler: {str(e)}")

async def process_time_entries_import(df: pd.DataFrame, current_user: User, db: Session) -> ImportResult:
    """
    Zeiterfassung-Import verarbeiten
    """
    imported_count = 0
    errors = []
    warnings = []
    
    # Benutzer-Mapping erstellen
    users = db.query(User).all()
    user_mapping = {user.full_name: user.id for user in users}
    
    for index, row in df.iterrows():
        try:
            # Datum parsen
            try:
                entry_date = pd.to_datetime(row['Datum']).date()
            except:
                errors.append(f"Zeile {index + 2}: Ungültiges Datum '{row['Datum']}'")
                continue
            
            # Benutzer finden
            user_name = str(row['Mitarbeiter']).strip()
            if user_name not in user_mapping:
                errors.append(f"Zeile {index + 2}: Benutzer '{user_name}' nicht gefunden")
                continue
            
            user_id = user_mapping[user_name]
            
            # Entry-Typ validieren
            try:
                entry_type = TimeEntryType(row['Typ'])
            except ValueError:
                errors.append(f"Zeile {index + 2}: Ungültiger Typ '{row['Typ']}'")
                continue
            
            # Subtyp (optional)
            subtype = None
            if 'Untertyp' in row and pd.notna(row['Untertyp']) and row['Untertyp']:
                try:
                    subtype = WorkTimeSubtype(row['Untertyp'])
                except ValueError:
                    warnings.append(f"Zeile {index + 2}: Ungültiger Untertyp '{row['Untertyp']}' ignoriert")
            
            # Stunden und Tage
            hours = float(row['Stunden']) if pd.notna(row['Stunden']) else 0.0
            days = float(row['Tage']) if 'Tage' in row and pd.notna(row['Tage']) else 0.0
            
             # Beschreibung
            description = str(row['Beschreibung']) if 'Beschreibung' in row and pd.notna(row['Beschreibung']) else None
            
            # Prüfen ob bereits existiert
            existing = db.query(TimeEntry).filter(
                and_(
                    TimeEntry.user_id == user_id,
                    TimeEntry.date == entry_date,
                    TimeEntry.entry_type == entry_type,
                    TimeEntry.subtype == subtype
                )
            ).first()
            
            if existing:
                warnings.append(f"Zeile {index + 2}: Eintrag für {user_name} am {entry_date} bereits vorhanden")
                continue
            
            # Neuen Eintrag erstellen
            db_entry = TimeEntry(
                user_id=user_id,
                date=entry_date,
                entry_type=entry_type,
                subtype=subtype,
                hours=hours,
                days=days,
                description=description
            )
            
            # Automatische Vorbereitungszeit berechnen
            db_entry.calculate_prep_time()
            
            db.add(db_entry)
            imported_count += 1
            
        except Exception as e:
            errors.append(f"Zeile {index + 2}: {str(e)}")
    
    if imported_count > 0:
        db.commit()
    
    return ImportResult(
        success=len(errors) == 0,
        imported_count=imported_count,
        errors=errors,
        warnings=warnings
    )

@router.get("/template/time-entries")
async def get_time_entries_template(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    CSV-Template für Import herunterladen
    """
    if current_user.role == UserRole.FACHKRAFT:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    # Template-Daten erstellen
    template_data = [{
        'Datum': '2024-01-15',
        'Mitarbeiter': 'Max Mustermann',
        'Typ': 'arbeitszeit',
        'Untertyp': 'stunden_am_kind',
        'Stunden': 8.0,
        'Tage': 0.0,
        'Beschreibung': 'Beispiel-Eintrag'
    }]
    
    df = pd.DataFrame(template_data)
    return export_to_csv(df, "zeiterfassung_import_template")