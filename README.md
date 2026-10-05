# NIRNAY-DDIL

### Immersive Decision Training in Degraded Communication Environments

> **Train decisions when information becomes uncertain.**

NIRNAY-DDIL is a browser-based decision-training simulator designed for environments where communication is **degraded, delayed, intermittent, or lost**.

The simulator places a trainee in the role of a command decision-maker managing a humanitarian relief operation. The trainee receives information from multiple field entities such as UAVs, ground units, relay nodes, and maritime units.

The key challenge is that **the trainee does not necessarily know what is actually happening**.

Communication failures can prevent important information from reaching the trainee, creating uncertainty, stale information, conflicting reports, and incomplete situational awareness.

---

##  Problem

In communication-degraded environments, a poor outcome does not necessarily mean that the decision itself was poor.

A trainee may make a reasonable decision based on the information available to them, while critical information may have been delayed or completely lost during transmission.

Traditional simulators often evaluate decisions primarily using the final outcome.

NIRNAY-DDIL focuses on a different question:

> **Was the decision reasonable given the information that was actually available at the time?**

---

##  Core Novelty

### Information-Conditioned Decision Assessment

NIRNAY-DDIL maintains two separate states:

**Ground Truth**

* What is actually happening in the simulated environment.

**Trainee Information State**



* What information has successfully reached the trainee.

These states can diverge when communication is degraded.

The system then evaluates the trainee's decision using the **information available at the exact decision time**, rather than using hindsight.
