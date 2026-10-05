"""Scenario definitions (pure data). The engine is scenario-agnostic: it needs a hidden binary
hypothesis (OK/BAD), a scripted world + communication timeline, scripted reports, and an action
table with utilities per hidden state. Fictional humanitarian data only."""


def _links(*rows):
    return {k: {"status": s, "latency": l, "packet_loss": p, "bandwidth": b} for k, s, l, p, b in rows}


def _degrade(tick, link, lat, loss, bw):
    return {"tick": tick, "type": "LINK_CHANGE", "link": link, "status": "DEGRADED",
            "latency": lat, "packet_loss": loss, "bandwidth": bw}


def _msg(id, tick, src, link, text, conf, claim, after, force=None, weight=1.0, priority="ROUTINE"):
    return {"id": id, "tick": tick, "src": src, "link": link, "text": text, "conf": conf,
            "claim": claim, "after": after, "force": force, "weight": weight, "priority": priority}


KESTREL = {
    "id": "sector_kestrel", "name": "SECTOR KESTREL", "subtitle": "Humanitarian Relief", "difficulty": "MODERATE",
    "comm_challenge": "DEGRADED / INTERMITTENT", "primary_challenge": "Stale / Missing Information",
    "description": "A humanitarian relief convoy must reach a remote settlement while communication reliability begins to deteriorate.",
    "entities": ["HQ", "UAV", "RELAY", "CONVOY", "VESSEL"], "start": "14:29:00", "decision_tick": 180, "seed": 1337,
    "tau": 120, "ack_lost": True, "asset": "CONVOY", "order_link": "RELAY-CONVOY",
    "probe_sources": ["UAV", "VESSEL", "RELAY", "NONE"],
    "hypothesis": {"question": "Is Route A passable?", "ok": "CLEAR", "bad": "BLOCKED", "prior_bad": 0.12, "truth_initial": "OK"},
    "map": {"entities": {"HQ": [12, 28], "RELAY": [35, 52], "UAV": [58, 25], "VESSEL": [76, 50], "CONVOY": [33, 82]},
            "destination": [90, 68],
            "routes": {"A": [[33, 82], [50, 80], [70, 74], [90, 68]], "B": [[33, 82], [42, 94], [70, 96], [84, 84], [90, 68]]}},
    "links": _links(("HQ-RELAY", "GOOD", 0.4, 0.02, 256), ("RELAY-CONVOY", "GOOD", 0.4, 0.02, 256),
                    ("UAV-RELAY", "GOOD", 0.5, 0.03, 256), ("VESSEL-RELAY", "GOOD", 0.6, 0.04, 128)),
    "timeline": [
        _degrade(70, "UAV-RELAY", 4.2, 0.68, 32),
        {"tick": 80, "type": "WORLD", "state": "BAD", "note": "Route A becomes blocked"},
        {"tick": 110, "type": "OBSERVATION", "entity": "UAV", "note": "UAV detects Route A blockage"},
    ],
    "messages": [
        _msg("m0", 10, "RELAY", "HQ-RELAY", "RELAY LINKS NOMINAL", 0.99, None, 3, "deliver"),
        _msg("m00", 24, "CONVOY", "RELAY-CONVOY", "CONVOY STAGED AT CHECKPOINT", 0.97, None, 4, "deliver"),
        _msg("m1", 38, "UAV", "UAV-RELAY", "ROUTE A APPEARS CLEAR", 0.95, "OK", 4, "deliver"),
        _msg("m2", 110, "UAV", "UAV-RELAY", "ROUTE A BLOCKAGE DETECTED", 0.90, "BAD", 2, "lose", priority="HIGH"),
        _msg("m3", 112, "VESSEL", "VESSEL-RELAY", "POSSIBLE OBSTRUCTION NEAR ROUTE A", 0.55, "BAD", 8, "deliver"),
    ],
    "actions": {
        "ROUTE_A": {"label": "ROUTE A", "kind": "commit", "travel": 42, "u": {"OK": 100, "BAD": 34},
                    "bad_event": "ASSET_HALTED", "bad_at": 0.55,
                    "outcome": {"OK": "CONVOY ARRIVED VIA ROUTE A", "BAD": "DELAYED — CONVOY HALTED ON ROUTE A"}},
        "ROUTE_B": {"label": "ROUTE B", "kind": "commit", "travel": 70, "u": {"OK": 70, "BAD": 70},
                    "outcome": {"OK": "CONVOY ARRIVED VIA ROUTE B", "BAD": "CONVOY ARRIVED VIA ROUTE B"}},
        "HOLD": {"label": "HOLD POSITION", "kind": "wait", "duration": 60, "u": {"OK": 45, "BAD": 45}},
        "RETASK_UAV": {"label": "RETASK UAV", "kind": "query", "via": "UAV-RELAY", "reply_src": "UAV", "duration": 50,
                       "u": {"OK": 50, "BAD": 50},
                       "reply": {"OK": "ROUTE A CONFIRMED CLEAR", "BAD": "ROUTE A CONFIRMED BLOCKED"}},
        "REQUEST_STATUS": {"label": "REQUEST STATUS", "kind": "query", "via": "RELAY-CONVOY", "reply_src": "CONVOY",
                           "duration": 40, "u": {"OK": 55, "BAD": 55},
                           "reply": {"OK": "CONVOY SCOUT: ROUTE A CLEAR", "BAD": "CONVOY SCOUT: ROUTE A OBSTRUCTED"}},
    },
}

HARBOR = {
    "id": "harbor_watch", "name": "OPERATION HARBOR WATCH", "subtitle": "Coastal Supply Coordination", "difficulty": "HIGH",
    "comm_challenge": "CONFLICTING / DELAYED INFORMATION", "primary_challenge": "Conflicting Information",
    "description": "A relief supply vessel must choose a port while UAV, vessel and ground-team reports of differing age and confidence conflict, and one update is still in transit.",
    "entities": ["HQ", "UAV", "RELAY", "VESSEL", "TEAM"], "start": "09:10:00", "decision_tick": 120, "seed": 4242,
    "tau": 120, "ack_lost": None, "asset": "VESSEL", "order_link": "RELAY-VESSEL",
    "probe_sources": ["UAV", "VESSEL", "TEAM", "NONE"],
    "hypothesis": {"question": "Is Port Alpha operating without congestion?", "ok": "OPERATIONAL", "bad": "CONGESTED",
                   "prior_bad": 0.35, "truth_initial": "OK"},
    "map": {"entities": {"HQ": [12, 25], "RELAY": [38, 45], "UAV": [60, 22], "VESSEL": [50, 75], "TEAM": [82, 55]},
            "ports": {"Port Alpha": [72, 78], "Port Beta": [28, 88]},
            "routes": {"COASTAL": [[50, 75], [72, 78]], "BETA": [[50, 75], [28, 88]], "INLAND": [[72, 78], [82, 55]]}},
    "links": _links(("HQ-RELAY", "GOOD", 0.4, 0.02, 256), ("RELAY-UAV", "GOOD", 0.5, 0.03, 192),
                    ("RELAY-VESSEL", "GOOD", 0.8, 0.05, 128), ("RELAY-TEAM", "GOOD", 0.7, 0.05, 96)),
    "timeline": [
        {"tick": 30, "type": "WORLD", "state": "BAD", "note": "Congestion builds at Port Alpha"},
        _degrade(55, "RELAY-VESSEL", 3.2, 0.42, 64),
        _degrade(85, "RELAY-TEAM", 2.5, 0.30, 48),
        {"tick": 90, "type": "OBSERVATION", "entity": "UAV", "note": "UAV sees vehicle queue at Port Alpha"},
    ],
    "messages": [
        _msg("h1", 20, "UAV", "RELAY-UAV", "PORT ALPHA APPEARS OPERATIONAL", 0.82, "OK", 4, "deliver"),
        _msg("h2", 45, "VESSEL", "RELAY-VESSEL", "POSSIBLE CONGESTION NEAR PORT ALPHA", 0.58, "BAD", 6, "deliver"),
        _msg("h3", 70, "TEAM", "RELAY-TEAM", "DISTRIBUTION ROUTE CURRENTLY SLOW", 0.70, "BAD", 5, "deliver", weight=0.6),
        _msg("h4", 95, "VESSEL", "RELAY-VESSEL", "PORT ALPHA QUEUE EXCEEDS SIX HOURS", 0.85, "BAD", 130, "deliver", priority="HIGH"),
    ],
    "actions": {
        "PORT_ALPHA": {"label": "CONTINUE TO PORT ALPHA", "kind": "commit", "travel": 60, "u": {"OK": 100, "BAD": 30},
                       "bad_event": "ASSET_DELAYED", "bad_at": 1.0,
                       "outcome": {"OK": "VESSEL BERTHED AT PORT ALPHA", "BAD": "DELAYED — CONGESTION AT PORT ALPHA"}},
        "PORT_BETA": {"label": "REDIRECT TO PORT BETA", "kind": "commit", "travel": 90, "u": {"OK": 72, "BAD": 72},
                      "outcome": {"OK": "VESSEL BERTHED AT PORT BETA (LONGER ROUTE)", "BAD": "VESSEL BERTHED AT PORT BETA (LONGER ROUTE)"}},
        "HOLD": {"label": "HOLD", "kind": "wait", "duration": 110, "u": {"OK": 50, "BAD": 50}},
        "RETASK_UAV": {"label": "RETASK UAV", "kind": "query", "via": "RELAY-UAV", "reply_src": "UAV", "duration": 60,
                       "u": {"OK": 55, "BAD": 55},
                       "reply": {"OK": "PORT ALPHA THROUGHPUT NORMAL", "BAD": "PORT ALPHA QUEUE CONFIRMED"}},
        "REQUEST_STATUS": {"label": "REQUEST STATUS", "kind": "query", "via": "RELAY-VESSEL", "reply_src": "VESSEL",
                           "duration": 50, "u": {"OK": 58, "BAD": 58},
                           "reply": {"OK": "VESSEL: PORT ALPHA BERTH AVAILABLE", "BAD": "VESSEL: PORT ALPHA QUEUE LONG"}},
    },
}

SCENARIOS = {s["id"]: s for s in (KESTREL, HARBOR)}


def public(s):
    """Scenario view safe for the trainee: no hidden truth, timeline, scripted messages or utilities."""
    keys = ("id", "name", "subtitle", "difficulty", "comm_challenge", "primary_challenge", "description",
            "entities", "map", "start", "decision_tick", "probe_sources")
    d = {k: s[k] for k in keys}
    d["actions"] = {k: {"label": a["label"], "kind": a["kind"]} for k, a in s["actions"].items()}
    d["question"] = s["hypothesis"]["question"]
    d["links"] = list(s["links"])
    return d
