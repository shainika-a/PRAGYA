"""SQLite persistence: missions, decisions, events, messages, assessments."""
import json
import os
import sqlite3
from contextlib import contextmanager

PATH = os.getenv("PRAGYA_DB", "pragya.db")
SCHEMA = """
CREATE TABLE IF NOT EXISTS missions(id INTEGER PRIMARY KEY AUTOINCREMENT, scenario_id TEXT, seed INTEGER, start_time TEXT,
  status TEXT, tick INTEGER, end_tick INTEGER);
CREATE TABLE IF NOT EXISTS decisions(mission_id INTEGER PRIMARY KEY, action TEXT, confidence INTEGER, probes TEXT, tick INTEGER);
CREATE TABLE IF NOT EXISTS events(mission_id INTEGER, id INTEGER, tick INTEGER, timestamp TEXT, type TEXT, source TEXT,
  target TEXT, payload TEXT, state_hash TEXT, PRIMARY KEY(mission_id,id));
CREATE TABLE IF NOT EXISTS messages(mission_id INTEGER, message_id TEXT, source TEXT, destination TEXT, content TEXT,
  priority TEXT, confidence REAL, status TEXT, generated INTEGER, delivered INTEGER, lost INTEGER, latency INTEGER,
  PRIMARY KEY(mission_id,message_id));
CREATE TABLE IF NOT EXISTS assessments(mission_id INTEGER PRIMARY KEY, data TEXT);
"""


@contextmanager
def tx():
    c = sqlite3.connect(PATH)
    c.row_factory = sqlite3.Row
    try:
        yield c
        c.commit()
    finally:
        c.close()


def init():
    with tx() as c:
        c.executescript(SCHEMA)


def create_mission(scenario_id, seed, start_time, end_tick):
    with tx() as c:
        return c.execute("INSERT INTO missions(scenario_id,seed,start_time,status,tick,end_tick) VALUES(?,?,?,?,0,?)",
                         (scenario_id, seed, start_time, "ACTIVE", end_tick)).lastrowid


def get_mission(mid):
    with tx() as c:
        r = c.execute("SELECT * FROM missions WHERE id=?", (mid,)).fetchone()
        return dict(r) if r else None


def list_missions():
    with tx() as c:
        return [dict(r) for r in c.execute("SELECT * FROM missions ORDER BY id DESC")]


def update_mission(mid, **kw):
    with tx() as c:
        c.execute(f"UPDATE missions SET {','.join(k + '=?' for k in kw)} WHERE id=?", (*kw.values(), mid))


def save_events(mid, ev, msgs):
    with tx() as c:
        c.execute("DELETE FROM events WHERE mission_id=?", (mid,))
        c.execute("DELETE FROM messages WHERE mission_id=?", (mid,))
        c.executemany("INSERT INTO events VALUES(?,?,?,?,?,?,?,?,?)", [
            (mid, e["id"], e["tick"], e["timestamp"], e["type"], e["source"], e["target"], json.dumps(e["payload"]), e["state_hash"]) for e in ev])
        c.executemany("INSERT INTO messages VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", [
            (mid, m["message_id"], m["source"], m["destination"], m["content"], m["priority"], m["confidence"], m["status"],
             m["timestamp_generated"], m["timestamp_delivered"], m["timestamp_lost"], m["latency"]) for m in msgs])


def load_events(mid):
    with tx() as c:
        return [{**dict(r), "payload": json.loads(r["payload"])} for r in
                c.execute("SELECT id,tick,timestamp,type,source,target,payload,state_hash FROM events WHERE mission_id=? ORDER BY id", (mid,))]


def save_decision(mid, d, tick):
    with tx() as c:
        c.execute("INSERT OR REPLACE INTO decisions VALUES(?,?,?,?,?)", (mid, d["action"], d["confidence"], json.dumps(d["probes"]), tick))


def get_decision(mid):
    with tx() as c:
        r = c.execute("SELECT * FROM decisions WHERE mission_id=?", (mid,)).fetchone()
        return {"action": r["action"], "confidence": r["confidence"], "probes": json.loads(r["probes"]), "tick": r["tick"]} if r else None


def save_assessment(mid, data):
    with tx() as c:
        c.execute("INSERT OR REPLACE INTO assessments VALUES(?,?)", (mid, json.dumps(data)))


def get_assessment(mid):
    with tx() as c:
        r = c.execute("SELECT data FROM assessments WHERE mission_id=?", (mid,)).fetchone()
        return json.loads(r["data"]) if r else None


def all_assessments():
    with tx() as c:
        return [{"mission_id": r["mission_id"], **json.loads(r["data"])} for r in c.execute("SELECT * FROM assessments ORDER BY mission_id")]
