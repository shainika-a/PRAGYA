"""Assessment: Bayesian belief from the reports that actually arrived, expected utility per action,
judgment regret, information regret, calibration and process findings. Deterministic; no ML."""
import math
from engine import clock, dtick, link_state, messages, truth_state


def posterior_bad(scn, delivered, tick):
    """P(BAD | delivered reports). Report reliability decays with observation age (time constant tau)."""
    h = scn["hypothesis"]
    lo = math.log(h["prior_bad"] / (1 - h["prior_bad"]))
    for m in delivered:
        if not m["claim"]:
            continue
        r = 0.5 + (m["confidence"] - 0.5) * math.exp(-(tick - m["observed"]) / scn["tau"])
        r = min(max(r, 0.501), 0.999)
        llr = math.log(r / (1 - r)) * m["weight"]
        lo += llr if m["claim"] == "BAD" else -llr
    return 1 / (1 + math.exp(-lo))


def assess(scn, d, ev):
    dt, acts, key = dtick(scn), scn["actions"], d["action"]
    allm = messages(ev, 10 ** 9)
    dlv = [m for m in messages(ev, dt).values() if m["status"] == "DELIVERED" and m["destination"] == "HQ"]
    pb = posterior_bad(scn, dlv, dt)
    eu = {k: (1 - pb) * a["u"]["OK"] + pb * a["u"]["BAD"] for k, a in acts.items()}
    best = max(eu, key=eu.get)
    truth = truth_state(scn, ev, dt)
    best_true = max(acts, key=lambda k: acts[k]["u"][truth])
    evpi = (1 - pb) * max(a["u"]["OK"] for a in acts.values()) + pb * max(a["u"]["BAD"] for a in acts.values()) - eu[best]
    jr, ir = eu[best] - eu[key], acts[best_true]["u"][truth] - acts[best]["u"][truth]
    argmax = {s: max(acts, key=lambda k: acts[k]["u"][s]) for s in ("OK", "BAD")}
    support = 100 * sum(p for s, p in (("OK", 1 - pb), ("BAD", pb)) if argmax[s] == key) if acts[key]["kind"] == "commit" \
        else 100 * min(1, eu[key] / eu[best])
    ages = [dt - m["observed"] for m in dlv]
    fresh = max(dlv, key=lambda m: m["observed"])["source"] if dlv else "NONE"
    pr, L = d["probes"], link_state(scn, ev, dt)
    degraded = [k for k, v in L.items() if v["status"] != "GOOD"]
    claims = {m["claim"] for m in dlv if m["claim"]}
    F = []

    def add(id, label, obs, evidence):
        F.append({"id": id, "label": label, "observed": bool(obs), "evidence": evidence})
    add("stale", "Used stale information", acts[key]["kind"] == "commit" and ages and max(ages) >= scn["tau"],
        f"Oldest report was {max(ages) if ages else 0}s old at decision (reliability time constant {scn['tau']}s)")
    add("conflict", "Decided despite conflicting reports", acts[key]["kind"] == "commit" and claims == {"OK", "BAD"},
        "Delivered reports disagreed" if claims == {"OK", "BAD"} else "Delivered reports did not conflict")
    add("no_info_action", "Did not seek additional information", acts[key]["kind"] == "commit", f"Selected action: {acts[key]['label']}")
    add("comm_aware", "Recognized degraded communication", pr["comm_issue"] == "YES" and degraded,
        f"Probe answer {pr['comm_issue']}; degraded links at decision: {', '.join(degraded) or 'none'}")
    add("freshest", "Identified the freshest report", pr["freshest"].upper() == fresh, f"Answered {pr['freshest']}; freshest was {fresh}")
    add("ack_missed", "Order acknowledgement not received", any(e["type"] == "ACK_LOST" for e in ev), "ACK_LOST recorded")
    add("overconfident", "Confidence exceeded model support", d["confidence"] > support + 10,
        f"Stated {d['confidence']}% vs model support {support:.0f}%")

    chain = []

    def C(t, kind, text, sev):
        chain.append({"tick": t, "clock": clock(scn, t), "kind": kind, "text": text, "severity": sev})
    for e in ev:
        p, t = e["payload"], e["tick"]
        if e["type"] == "LINK_DEGRADED":
            C(t, "link", f"{p['link']} degrades (loss {int(p['packet_loss'] * 100)}%, latency {p['latency']}s)", "warn")
        elif e["type"] == "WORLD_STATE_CHANGED":
            C(t, "truth", p["note"] + " (hidden from trainee)", "critical")
        elif e["type"] == "ENTITY_OBSERVATION":
            C(t, "truth", p["note"], "info")
        elif e["type"] == "MESSAGE_DELIVERED" and e["target"] == "HQ" and t <= dt and p["id"] in allm:
            m = allm[p["id"]]
            C(t, "delivered", f"{m['source']} report received: {m['content']}", "ok")
        elif e["type"] == "MESSAGE_LOST" and e["target"] == "HQ" and p["id"] in allm:
            C(t, "lost", f"{allm[p['id']]['source']} update LOST: {allm[p['id']]['content']}", "critical")
        elif e["type"] == "MESSAGE_GENERATED" and e["target"] == "HQ":
            m = allm[p["id"]]
            if m["timestamp_delivered"] and m["timestamp_delivered"] > dt:
                C(t, "delayed", f"{m['source']} update generated, still in transit at decision (arrives {clock(scn, m['timestamp_delivered'])}): {m['content']}", "warn")
        elif e["type"] == "PROBE_STARTED":
            C(t, "decision", f"Decision window opens; freshest report is {fresh}", "info")
        elif e["type"] == "DECISION_MADE":
            C(t, "decision", f"Trainee selects {acts[key]['label']}", "info")
    chain.sort(key=lambda c: c["tick"])

    end = next(e for e in ev if e["type"] == "MISSION_ENDED")
    comm = [{"message_id": m["message_id"], "source": m["source"], "content": m["content"], "status": m["status"],
             "generated": m["timestamp_generated"], "delivered": m["timestamp_delivered"], "lost": m["timestamp_lost"],
             "latency": m["latency"], "disposition": "LOST" if m["status"] == "LOST" else
             "DELIVERED_AFTER_DECISION" if m["timestamp_delivered"] and m["timestamp_delivered"] > dt else m["status"]}
            for m in allm.values() if m["destination"] == "HQ"]
    return {
        "scenario_id": scn["id"], "scenario_name": scn["name"], "decision_tick": dt,
        "your_information": {"clock": clock(scn, dt), "reports": [
            {"source": m["source"], "content": m["content"], "confidence": m["confidence"], "age": dt - m["observed"]} for m in dlv],
            "degraded_links": degraded, "unreceived": [m["content"] for m in allm.values()
                                                       if m["destination"] == "HQ" and m["status"] == "LOST"]},
        "ground_truth": {"state": truth, "label": scn["hypothesis"]["ok" if truth == "OK" else "bad"],
                         "question": scn["hypothesis"]["question"], "outcome": end["payload"]["outcome"]},
        "communication_events": comm, "information_gap": chain,
        "decision": {"action": key, "label": acts[key]["label"], "confidence": d["confidence"], "probes": pr},
        "best_modeled_action": {"action": best, "label": acts[best]["label"],
                                "expected_utility": {k: round(v, 1) for k, v in eu.items()}},
        "best_with_complete_information": {"action": best_true, "label": acts[best_true]["label"]},
        "belief": {"p_bad": round(pb, 3), "p_ok": round(1 - pb, 3)},
        "judgment_regret": round(jr, 1), "information_regret": round(ir, 1), "expected_value_of_perfect_information": round(evpi, 1),
        "attribution": ("information" if ir > 0 and jr < 1 and key == best else "decision" if jr >= 1 else "none"),
        "calibration": {"stated_confidence": d["confidence"], "model_support": round(support, 1),
                        "gap": round(d["confidence"] - support, 1), "probe_estimate": pr["p_ok"],
                        "probe_error": round(abs(pr["p_ok"] - 100 * (1 - pb)), 1)},
        "findings": F, "mean_info_age": round(sum(ages) / len(ages), 1) if ages else 0,
        "outcome": end["payload"]["outcome"], "head_hash": ev[-1]["state_hash"], "event_count": len(ev),
        "assumptions": "Utilities and priors are scenario parameters; regret is measured against modeled alternatives, not a 'correct' human answer.",
    }
