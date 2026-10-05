# PRAGYA — backend (FastAPI + SQLite)

    python -m venv venv && venv\Scripts\activate      # Windows (use `source venv/bin/activate` elsewhere)
    pip install -r requirements.txt
    uvicorn app.main:app --reload                       # http://localhost:8000/docs

Flow: `POST /api/missions {scenario_id}` → `POST /api/missions/{id}/tick {ticks}` until `phase=DECISION`
→ `POST /api/missions/{id}/decision` → tick until `ENDED` → `GET /aar`, `/replay?view=trainee|truth|comm`, `/api/analytics`.
Scenarios: `sector_kestrel`, `harbor_watch`. Same scenario + seed + decision ⇒ identical event history (hash-chained).
Live mission responses never contain ground truth, lost messages or utilities; those are released after the mission ends.
