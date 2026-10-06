"""Simulation engine: communication network, message lifecycle, order lifecycle, consequences,
ground truth vs trainee information state, and the hash-chained event history.
One tick = one simulated second. generate(scenario, seed, decision) is a pure, deterministic function."""
import hashlib
import json
import random

DECISION_OFFSET = 3  # decision is timestamped this many ticks after the window opens
VISIBLE = {"MISSION_STARTED", "LINK_DEGRADED", "LINK_RECOVERED", "PROBE_STARTED", "DECISION_MADE", "ORDER_ISSUED",
           "ORDER_QUEUED", "ORDER_IN_TRANSIT", "ORDER_DELIVERED", "ORDER_EXECUTING", "ACK_GENERATED", "ACK_IN_TRANSIT",
           "ACK_RECEIVED", "ACK_LOST", "ASSET_MOVING", "ASSET_HALTED", "ASSET_DELAYED", "ASSET_ARRIVED",
           "ASSET_HOLDING", "INFORMATION_REFRESHED", "MISSION_ENDED"}


def dtick(scn):
    return scn["decision_tick"] + DECISION_OFFSET


def clock(scn, tick):
    h, m, s = map(int, scn["start"].split(":"))
    t = h * 3600 + m * 60 + s + tick
    return f"{t // 3600 % 24:02d}:{t // 60 % 60:02d}:{t % 60:02d}"


def visible(e):
    """Trainee-visible events: only delivered reports addressed to HQ, plus telemetry/orders/consequences."""
    if e["type"] == "MESSAGE_DELIVERED":
        return e["target"] == "HQ"
    return e["type"] in VISIBLE


def _mp(id, content, conf, observed, link, latency, claim=None, weight=1.0, priority="ROUTINE"):
    return dict(id=id, content=content, priority=priority, confidence=conf, claim=claim, weight=weight,
                observed=observed, link=link, latency=latency)


# ---------- state reconstruction (used by live view, AAR and replay) ----------
def link_state(scn, ev, tick):
    L = {k: dict(v) for k, v in scn["links"].items()}
    for e in ev:
        if e["tick"] <= tick and e["type"] in ("LINK_DEGRADED", "LINK_RECOVERED"):
            p = e["payload"]
            L[p["link"]].update({k: p[k] for k in ("status", "latency", "packet_loss", "bandwidth")})
    return L


def truth_state(scn, ev, tick):
    s = scn["hypothesis"]["truth_initial"]
    for e in ev:
        if e["type"] == "WORLD_STATE_CHANGED" and e["tick"] <= tick:
            s = e["payload"]["state"]
    return s


def messages(ev, tick):
    """Message records with lifecycle: GENERATED, QUEUED, IN_TRANSIT, DELIVERED, LOST, EXPIRED."""
    M = {}
    for e in ev:
        if e["tick"] > tick or not e["type"].startswith("MESSAGE_"):
            continue
        p, st = e["payload"], e["type"][8:]
        if st == "GENERATED":
            M[p["id"]] = {"message_id": p["id"], "timestamp_generated": e["tick"], "source": e["source"],
                          "destination": e["target"], "content": p["content"], "priority": p["priority"],
                          "confidence": p["confidence"], "claim": p["claim"], "weight": p["weight"],
                          "observed": p["observed"], "link": p["link"], "latency": p["latency"],
                          "status": "GENERATED", "timestamp_delivered": None, "timestamp_lost": None}
        else:
            m = M[p["id"]]
            m["status"] = st
            if st == "DELIVERED":
                m["timestamp_delivered"] = e["tick"]
            elif st in ("LOST", "EXPIRED"):
                m["timestamp_lost"] = e["tick"]
    return M


def asset_state(ev, tick):
    st = {"status": "STAGED", "route": None, "start_tick": None, "travel": None}
    for e in ev:
        if e["tick"] <= tick and e["type"].startswith("ASSET_"):
            st["status"] = e["type"][6:]
            if st["status"] == "MOVING":
                st.update(route=e["payload"]["route"], start_tick=e["tick"], travel=e["payload"]["travel"])
    return st


def trainee_state(scn, ev, tick):
    """Everything the trainee is allowed to know at `tick`. Lost/in-flight reports never appear here."""
    tau, reports = scn["tau"], []
    delivered = [m for m in messages(ev, tick).values() if m["status"] == "DELIVERED" and m["destination"] == "HQ"]
    for m in sorted(delivered, key=lambda m: -m["timestamp_delivered"]):
        age = tick - m["observed"]
        reports.append({**{k: m[k] for k in ("message_id", "source", "content", "confidence", "priority", "latency", "link")},
                        "observed_tick": m["observed"], "observed_clock": clock(scn, m["observed"]),
                        "received_tick": m["timestamp_delivered"], "received_clock": clock(scn, m["timestamp_delivered"]),
                        "age": age, "age_since_receipt": tick - m["timestamp_delivered"],
                        "freshness": "FRESH" if age < tau / 2 else "AGING" if age < tau else "STALE", "status": "DELIVERED"})
    orders = [{"stage": e["type"], "tick": e["tick"], "clock": e["timestamp"]} for e in ev
              if e["tick"] <= tick and e["type"][:5] in ("ORDER", "ACK_G", "ACK_I", "ACK_R", "ACK_L")]
    return {"tick": tick, "clock": clock(scn, tick), "links": link_state(scn, ev, tick), "reports": reports,
            "orders": orders, "asset": asset_state(ev, tick)}


def truth_view(scn, ev, tick):
    h, s = scn["hypothesis"], truth_state(scn, ev, tick)
    return {"tick": tick, "clock": clock(scn, tick),
            "hypothesis": {"question": h["question"], "state": s, "label": h["ok"] if s == "OK" else h["bad"]},
            "observations": [{"tick": e["tick"], "clock": e["timestamp"], "entity": e["source"], "note": e["payload"]["note"]}
                             for e in ev if e["type"] == "ENTITY_OBSERVATION" and e["tick"] <= tick],
            "messages": list(messages(ev, tick).values()), "links": link_state(scn, ev, tick), "asset": asset_state(ev, tick)}


# ---------- deterministic event generation ----------
def generate(scn, seed, decision=None):
    rng, ev = random.Random(seed), []
    links = {k: dict(v) for k, v in scn["links"].items()}

    def E(t, ty, s="", d="", **p):
        ev.append({"tick": t, "type": ty, "source": s, "target": d, "payload": p})

    E(0, "MISSION_STARTED", "SYSTEM", "", scenario=scn["id"], seed=seed)
    items = [(x["tick"], 0, x) for x in scn["timeline"]] + [(m["tick"], 1, m) for m in scn["messages"]]
    for t, kind, x in sorted(items, key=lambda i: (i[0], i[1])):
        if kind == 0:
            if x["type"] == "LINK_CHANGE":
                props = {k: x[k] for k in ("status", "latency", "packet_loss", "bandwidth")}
                links[x["link"]].update(props)
                a, b = x["link"].split("-")
                E(t, "LINK_DEGRADED" if x["status"] != "GOOD" else "LINK_RECOVERED", a, b, link=x["link"], **props)
            elif x["type"] == "WORLD":
                E(t, "WORLD_STATE_CHANGED", "WORLD", "", state=x["state"], note=x["note"])
            else:
                E(t, "ENTITY_OBSERVATION", x["entity"], "", note=x["note"])
            continue
        lk, r, j = links[x["link"]], rng.random(), rng.random()  # always draw: keeps runs reproducible
        lat = x["after"] or max(1, round(lk["latency"] * (1 + j)))
        lost = x["force"] == "lose" or (x["force"] != "deliver" and r < lk["packet_loss"])
        body = _mp(x["id"], x["text"], x["conf"], t, x["link"], lat, x["claim"], x["weight"], x["priority"])
        E(t, "MESSAGE_GENERATED", x["src"], "HQ", **body)
        E(t, "MESSAGE_QUEUED", x["src"], "HQ", id=x["id"])
        E(t + 1, "MESSAGE_IN_TRANSIT", x["src"], "HQ", id=x["id"])
        ty = "MESSAGE_LOST" if lost else "MESSAGE_EXPIRED" if lat > scn.get("ttl", 400) else "MESSAGE_DELIVERED"
        E(t + lat, ty, x["src"], "HQ", id=x["id"], latency=lat, link=x["link"], link_status=lk["status"])
    E(scn["decision_tick"], "PROBE_STARTED", "SYSTEM", "")

    if decision:
        key, a, dt = decision["action"], scn["actions"][decision["action"]], dtick(scn)
        r = random.Random(f"{scn['id']}:{seed}:{key}")
        r_ack, r1, r2 = r.random(), r.random(), r.random()
        asset, ol, L = scn["asset"], scn["order_link"], link_state(scn, ev, dt)
        E(dt, "DECISION_MADE", "HQ", "", action=key, confidence=decision["confidence"], probes=decision["probes"])
        for o, ty, s, d in ((1, "ORDER_ISSUED", "HQ", "RELAY"), (2, "ORDER_QUEUED", "HQ", "RELAY"),
                            (3, "ORDER_IN_TRANSIT", "RELAY", asset), (7, "ORDER_DELIVERED", "RELAY", asset),
                            (9, "ORDER_EXECUTING", asset, ""), (10, "ACK_GENERATED", asset, "HQ"),
                            (12, "ACK_IN_TRANSIT", asset, "HQ")):
            E(dt + o, ty, s, d, action=key)
        ack_loss = 1 - (1 - L["HQ-RELAY"]["packet_loss"]) * (1 - L[ol]["packet_loss"])
        ack_lost = scn["ack_lost"] if scn.get("ack_lost") is not None else r_ack < ack_loss
        E(dt + 15, "ACK_LOST" if ack_lost else "ACK_RECEIVED", asset, "HQ", action=key)
        s0, k = dt + 9, a["kind"]
        if k == "commit":
            E(s0, "ASSET_MOVING", asset, "", route=a["label"], travel=a["travel"])
            arr = s0 + a["travel"]
            bad = truth_state(scn, ev, arr) == "BAD"
            out = a["outcome"]["BAD" if bad else "OK"]
            if bad and a.get("bad_event"):
                tb = s0 + round(a["travel"] * a.get("bad_at", 1))
                E(tb, a["bad_event"], asset, "", route=a["label"])
                end = tb + 20
            else:
                E(arr, "ASSET_ARRIVED", asset, "", route=a["label"])
                end = arr + 8
        elif k == "wait":
            end = dt + a["duration"]
            E(s0, "ASSET_HOLDING", asset, "")
            E(end - 1, "INFORMATION_REFRESHED", "HQ", "")
            n = sum(1 for e in ev if e["type"] == "MESSAGE_DELIVERED" and e["target"] == "HQ" and dt < e["tick"] <= end)
            out = f"DELAYED — HELD; {n} NEW REPORT(S) RECEIVED"
        else:  # query: request + reply both cross the link and can fail
            lk = L[a["via"]]
            lat = max(2, round(lk["latency"] * 2))
            req_lost, rep_lost = r1 < lk["packet_loss"], r2 < lk["packet_loss"]
            E(s0, "MESSAGE_GENERATED", "HQ", a["reply_src"], **_mp("q1", "STATUS REQUEST", 1.0, s0, a["via"], lat, priority="HIGH"))
            E(s0 + lat, "MESSAGE_LOST" if req_lost else "MESSAGE_DELIVERED", "HQ", a["reply_src"], id="q1", latency=lat, link=a["via"])
            st = truth_state(scn, ev, s0 + lat)
            if not req_lost:
                t1 = s0 + lat
                E(t1, "MESSAGE_GENERATED", a["reply_src"], "HQ", **_mp("r1", a["reply"][st], 0.9, t1, a["via"], lat, st, 1.0, "HIGH"))
                E(t1 + lat, "MESSAGE_LOST" if rep_lost else "MESSAGE_DELIVERED", a["reply_src"], "HQ", id="r1", latency=lat, link=a["via"])
            end = dt + a["duration"]
            out = "DELAYED — STATUS CONFIRMED: " + a["reply"][st] if not (req_lost or rep_lost) else "DELAYED — NO STATUS REPLY RECEIVED"
        E(end, "MISSION_ENDED", "SYSTEM", "", outcome=out, action=key)
        ev = [e for e in ev if e["tick"] <= end]

    ev.sort(key=lambda e: e["tick"])
    prev = "0" * 64
    for i, e in enumerate(ev, 1):
        e["id"], e["timestamp"] = i, clock(scn, e["tick"])
        blob = json.dumps([e["tick"], e["type"], e["source"], e["target"], e["payload"]], sort_keys=True)
        prev = hashlib.sha256((prev + blob).encode()).hexdigest()
        e["state_hash"] = prev
    return ev
