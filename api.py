"""HTTP API. The browser only ever receives the trainee information state during a live mission;
ground truth, assessment and full replay are released only after the mission has ended."""
from fastapi import APIRouter, HTTPException

import assessment as asm
import db
import engine as eng
from models import DecisionIn, MissionCreate, TickIn
from scenarios import SCENARIOS, public

r = APIRouter(prefix="/api")


def _scn(sid):
    if sid not in SCENARIOS:
        raise HTTPException(404, f"Scenario '{sid}' not found")
    return SCENARIOS[sid]


def _mission(mid):
    m = db.get_mission(mid)
    if not m:
        raise HTTPException(404, f"Mission {mid} not found")
    return m


def _state(m, new_events=None):
    scn, ev, dec = _scn(m["scenario_id"]), db.load_events(m["id"]), db.get_decision(m["id"])
    s = eng.trainee_state(scn, ev, m["tick"])
    phase = "ENDED" if m["status"] == "ENDED" else "EXECUTING" if dec else "DECISION" if m["tick"] >= scn["decision_tick"] else "OBSERVING"
    s.update(mission_id=m["id"], scenario_id=scn["id"], seed=m["seed"], status=m["status"], phase=phase,
             decision_tick=scn["decision_tick"], end_tick=m["end_tick"] if dec else None,
             decision={"action": dec["action"], "confidence": dec["confidence"]} if dec else None,
             outcome=next((e["payload"]["outcome"] for e in ev if e["type"] == "MISSION_ENDED" and m["status"] == "ENDED"), None))
    if new_events is not None:
        s["new_events"] = new_events
    return s


def _finish(m):
    scn, ev = _scn(m["scenario_id"]), db.load_events(m["id"])
    db.update_mission(m["id"], status="ENDED")
    db.save_assessment(m["id"], asm.assess(scn, db.get_decision(m["id"]), ev))


@r.get("/health")
def health():
    return {"status": "ok"}


@r.get("/scenarios")
def scenarios():
    return [public(s) for s in SCENARIOS.values()]


@r.get("/scenarios/{sid}")
def scenario(sid: str):
    return public(_scn(sid))


@r.post("/missions", status_code=201)
def create(body: MissionCreate):
    scn = _scn(body.scenario_id)
    seed = scn["seed"] if body.seed is None else body.seed
    ev = eng.generate(scn, seed)
    mid = db.create_mission(scn["id"], seed, scn["start"], scn["decision_tick"])
    db.save_events(mid, ev, eng.messages(ev, 10 ** 9).values())
    return _state(db.get_mission(mid))


@r.get("/missions")
def missions():
    return db.list_missions()


@r.get("/missions/{mid}")
def mission(mid: int):
    return _state(_mission(mid))


@r.post("/missions/{mid}/tick")
def tick(mid: int, body: TickIn = TickIn()):
    m = _mission(mid)
    if m["status"] == "ENDED":
        return _state(m, [])
    scn, dec = _scn(m["scenario_id"]), db.get_decision(mid)
    old, new = m["tick"], min(m["end_tick"], m["tick"] + body.ticks)  # end_tick == decision_tick until a decision exists
    db.update_mission(mid, tick=new)
    m = _mission(mid)
    if dec and new >= m["end_tick"]:
        _finish(m)
        m = _mission(mid)
    new_ev = [e for e in db.load_events(mid) if old < e["tick"] <= new and eng.visible(e)]
    return _state(m, new_ev)


@r.post("/missions/{mid}/decision")
def decide(mid: int, body: DecisionIn):
    m, scn = _mission(mid), None
    scn = _scn(m["scenario_id"])
    if m["status"] == "ENDED" or db.get_decision(mid):
        raise HTTPException(409, "A decision has already been recorded for this mission")
    if m["tick"] < scn["decision_tick"]:
        raise HTTPException(409, "The decision window has not opened yet")
    if body.action not in scn["actions"]:
        raise HTTPException(422, f"Invalid action '{body.action}'. Valid: {', '.join(scn['actions'])}")
    if body.probes.freshest.upper() not in scn["probe_sources"]:
        raise HTTPException(422, f"Invalid freshest-report answer. Valid: {', '.join(scn['probe_sources'])}")
    d = {"action": body.action, "confidence": body.confidence, "probes": body.probes.model_dump()}
    ev = eng.generate(scn, m["seed"], d)
    db.save_events(mid, ev, eng.messages(ev, 10 ** 9).values())
    db.save_decision(mid, d, eng.dtick(scn))
    db.update_mission(mid, tick=eng.dtick(scn), end_tick=ev[-1]["tick"])
    return _state(_mission(mid))


@r.get("/missions/{mid}/aar")
def aar(mid: int):
    m = _mission(mid)
    a = db.get_assessment(mid)
    if m["status"] != "ENDED" or not a:
        raise HTTPException(409, "After-action review is available once the mission has ended")
    return a


@r.get("/missions/{mid}/replay")
def replay(mid: int, view: str = "trainee", tick: int | None = None):
    m = _mission(mid)
    if m["status"] != "ENDED":
        raise HTTPException(409, "Replay is available once the mission has ended")
    if view not in ("trainee", "truth", "comm"):
        raise HTTPException(422, "view must be trainee, truth or comm")
    scn, ev = _scn(m["scenario_id"]), db.load_events(mid)
    t = m["end_tick"] if tick is None else max(0, min(tick, m["end_tick"]))
    pick = {"trainee": eng.visible, "truth": lambda e: True,
            "comm": lambda e: e["type"][:5] in ("MESSA", "LINK_", "ORDER", "ACK_G", "ACK_I", "ACK_R", "ACK_L")}[view]
    evs = [e for e in ev if pick(e)]
    state = (eng.trainee_state(scn, ev, t) if view == "trainee" else eng.truth_view(scn, ev, t) if view == "truth" else
             {"tick": t, "clock": eng.clock(scn, t), "links": eng.link_state(scn, ev, t), "messages": list(eng.messages(ev, t).values())})
    return {"view": view, "tick": t, "clock": eng.clock(scn, t), "end_tick": m["end_tick"], "ticks": sorted({e["tick"] for e in evs}),
            "events": evs, "state": state}


@r.get("/analytics")
def analytics():
    rows, n = db.all_assessments(), 0
    n = len(rows)
    avg = lambda k, f=lambda x: x: round(sum(f(x) for x in [r_[k] for r_ in rows]) / n, 2) if n else 0
    count = lambda xs: {k: xs.count(k) for k in sorted(set(xs))}
    return {"missions": n, "by_scenario": count([x["scenario_id"] for x in rows]),
            "mean_judgment_regret": avg("judgment_regret"), "mean_information_regret": avg("information_regret"),
            "mean_info_age": avg("mean_info_age"), "mean_confidence_gap": round(sum(x["calibration"]["gap"] for x in rows) / n, 2) if n else 0,
            "attribution": count([x["attribution"] for x in rows]), "outcomes": count([x["outcome"] for x in rows]),
            "findings": {f["id"]: sum(1 for x in rows for g in x["findings"] if g["id"] == f["id"] and g["observed"])
                         for f in (rows[0]["findings"] if rows else [])},
            "series": [{"mission_id": x["mission_id"], "scenario": x["scenario_id"], "judgment_regret": x["judgment_regret"],
                        "information_regret": x["information_regret"], "confidence_gap": x["calibration"]["gap"]} for x in rows]}
