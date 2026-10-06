# PRAGYA — Decision Training Simulator

### Decision-making when information becomes uncertain.

PRAGYA is an interactive decision-training simulator designed for environments where communication is **degraded, delayed, intermittent, or unreliable**.

The simulator maintains a hidden **ground-truth world state**, while the trainee sees only the information that successfully reaches them through a simulated communication network.

This creates a realistic decision-making problem:

> **The system knows what is happening. The trainee only knows what they have been told.**

After the mission, PRAGYA reconstructs the information available at the exact moment of the decision and evaluates the decision without relying on hindsight.

---

## The Problem

In communication-degraded environments, a bad outcome does not necessarily mean that the decision itself was bad.

A trainee may make a reasonable decision based on the information available to them, while critical information may have:

* been delayed
* been lost
* arrived after the decision
* become stale
* originated from an unreliable source
* conflicted with another report
* been affected by a degraded communication link

Traditional simulation approaches can easily evaluate a decision using information that the trainee **did not have at the time**.

PRAGYA addresses this problem by separating:

### What actually happened

from

### What the trainee actually knew

---

## Core Novelty

### Information-Conditioned Decision Assessment

PRAGYA does not simply ask:

> "Did the trainee make the correct decision?"

Instead, it asks:

> **"Given the information that actually reached the trainee at that moment, how good was the decision?"**

The system maintains two separate information states:

```text
                    SIMULATION
                        |
            +-----------+-----------+
            |                       |
            v                       v
      GROUND TRUTH           COMMUNICATION
      What is actually        What information
       happening              gets transmitted
            |                       |
            +-----------+-----------+
                        |
                        v
              TRAINEE INFORMATION
              What the trainee
                 actually sees
                        |
                        v
                   DECISION
                        |
                        v
                AAR / ASSESSMENT
```

This allows PRAGYA to distinguish between **decision quality** and **information availability**.

---

## Judgment Regret vs Information Regret

One of PRAGYA's key analytical features is separating two different sources of loss.

### Judgment Regret

**Judgment Regret** measures how much worse the trainee's chosen action was compared with the best modeled action using the information that was actually available.

In other words:

> **Did the trainee make poor use of the information they had?**

A high judgment regret suggests that a better action was available even without additional information.

### Information Regret

**Information Regret** measures the value lost because useful information was unavailable.

It compares the best modeled decision under:

* Available trainee information
* Complete information

This helps answer:

> **How much of the outcome was caused by missing information rather than the trainee's decision?**

---

## Example

Suppose:

```text
GROUND TRUTH
Route A = BLOCKED
Route B = CLEAR
```

The UAV detects the blockage.

However:

```text
UAV -> Relay
      |
Communication degraded
      |
Blockage update LOST
      |
HQ never receives it
```

The trainee therefore sees:

```text
UAV
"Route A appears clear"
Confidence: 95%
Age: 2m 18s
```

The trainee selects Route A.

The convoy eventually encounters the blockage.

A conventional system might simply report:

```text
BAD DECISION
```

PRAGYA instead reconstructs the decision context:

```text
Trainee information:
Route A appeared clear
Latest blockage report was unavailable
Communication was degraded
```

The system can then determine whether Route A was actually a poor decision **given what the trainee knew**.

This is the central principle behind PRAGYA.

---

## Communication-Aware Simulation

PRAGYA contains a simulated communication layer between entities.

Communication links can experience:

* latency
* packet loss
* limited bandwidth
* intermittent availability
* degradation
* disconnection
* lost acknowledgements

A message follows a lifecycle:

```text
GENERATED
    |
QUEUED
    |
IN TRANSIT
    |
DELIVERED
    or
LOST
```

The trainee's information state is updated **only when information is successfully delivered**.

A lost message does not appear in the information feed.

---

## Information Provenance

PRAGYA tracks the causal path of important information.

For example:

```text
Communication degradation
        |
UAV -> Relay link becomes unreliable
        |
UAV detects route blockage
        |
Blockage report generated
        |
Message transmitted
        |
Message lost
        |
HQ retains stale information
        |
Trainee makes decision
```

This allows the After-Action Review to answer not only:

> "What information was missing?"

but also:

> **"Why was it missing?"**

---

## Mission Environment

PRAGYA uses fictional humanitarian-relief scenarios to demonstrate decision-making under communication uncertainty.

The platform can model multiple entities, including:

* HQ
* UAV
* Relay Node
* Land Convoy
* Maritime Vessel
* Ground Distribution Teams

Entities communicate through simulated links whose reliability can change throughout the mission.

---

## Sector KESTREL

### Humanitarian Relief Convoy

Sector KESTREL is the primary demonstration scenario.

The trainee acts as a decision-maker coordinating a humanitarian relief convoy.

The environment contains:

* HQ
* UAV
* Relay
* Convoy
* Maritime Vessel

The convoy must choose between alternative routes while communication conditions deteriorate.

### Core challenge

The scenario demonstrates:

* stale information
* lost UAV reports
* degraded relay communication
* ambiguous reports
* delayed information
* order delivery
* acknowledgement loss
* decision-making under uncertainty

---

## Operation Harbor Watch

PRAGYA is designed as a reusable decision-training framework rather than a single hardcoded scenario.

A second scenario demonstrates a different decision challenge.

### Coastal Humanitarian Supply Coordination

Entities include:

* HQ
* Coastal Relay
* Supply Vessel
* UAV
* Distribution Team

The main challenge focuses on **conflicting and differently aged information**.

For example:

```text
UAV:
Port Alpha appears operational
Confidence: 82%

Supply Vessel:
Possible congestion near Port Alpha
Confidence: 58%

Ground Team:
Distribution route currently slow
Confidence: 70%
```

The trainee must determine whether to:

* continue toward Port Alpha
* redirect to Port Beta
* hold position
* request updated status
* retask the UAV

The outcome depends on the actual simulated state and communication conditions rather than a predetermined "correct" answer.

---

## Decision Probes

Before making a final decision, PRAGYA can collect structured decision inputs.

Examples:

### Probability Assessment

> How likely is Route A to be clear?

`0–100%`

### Information Freshness

> Which report is currently the freshest?

* UAV
* Maritime
* Neither

### Communication Awareness

> Do you believe communication degradation is affecting your information?

* Yes
* No
* Unsure

These probes are **not intended to read the trainee's mind**.

They provide structured, observable inputs that can be used to analyze:

* confidence
* calibration
* information awareness
* decision process

---

## Order and ACK Tracking

Decisions can generate operational orders that travel through the same communication system.

An order can progress through:

```text
ISSUED
   |
QUEUED
   |
IN TRANSIT
   |
RECEIVED
   |
EXECUTING
   |
ACK GENERATED
   |
ACK IN TRANSIT
   |
ACK RECEIVED
```

Communication failures can occur at any stage.

For example:

```text
Order delivered
      |
Convoy executes order
      |
ACK generated
      |
ACK lost
      |
HQ does not know whether the order was acknowledged
```

This creates another layer of uncertainty for the trainee.

---

## After-Action Review

After the mission ends, PRAGYA generates an After-Action Review based on the actual recorded mission.

The AAR contains four major perspectives.

### 1. Your Information

What the trainee actually knew.

Includes:

* received reports
* report confidence
* information age
* source
* communication status
* stale information
* conflicting information

### 2. Ground Truth

What actually happened in the simulation.

This information is intentionally unavailable to the trainee during the live mission.

### 3. Information Gap

A chronological reconstruction showing where information was lost, delayed, or degraded.

Example:

```text
14:30:10
Communication degradation begins

14:30:20
Route A becomes blocked

14:30:50
UAV detects blockage

14:30:52
UAV blockage report is lost

14:32:00
HQ still holds stale Route A information

14:32:03
Trainee makes decision
```

### 4. Decision Assessment

The AAR presents:

* selected action
* decision confidence
* best modeled action using available information
* judgment regret
* best modeled action using complete information
* information regret
* confidence calibration
* observable process findings

PRAGYA avoids labeling decisions simply as "correct" or "wrong".

Instead, the system reports:

> **Best Modeled Action**

because the assessment depends on the simulation model and the information available at decision time.

---

## Three-View Mission Replay

Every completed mission can be replayed.

The replay system provides three perspectives.

### Trainee View

Shows only the information that was actually available to the trainee.

### Ground Truth View

Shows the actual state of the simulation.

### Communication View

Shows:

* Generated
* Sent
* Delivered
* Lost
* Delayed

This allows users to reconstruct exactly how communication conditions affected the trainee's information.

---

## Deterministic Replay

Mission runs are designed to be reproducible.

Each mission contains a scenario and deterministic seed.

Given the same:

```text
Scenario
+
Seed
+
Trainee Decisions
```

the simulation can reproduce the same sequence of events.

This supports:

* replay
* debugging
* evaluation
* demonstration
* reproducible experiments

---

## Analytics

PRAGYA provides cross-mission analytics including:

* Missions completed
* Decisions analyzed
* Information gaps
* Average information age
* Communication reliability
* Confidence calibration
* Decision outcomes
* Stale-information usage
* Communication awareness
* Missed acknowledgements

The system focuses on **observable behavior and simulation data** rather than making unsupported psychological claims.

---

## Architecture

PRAGYA follows a clear frontend/backend separation.

The **backend is the source of truth** for scenarios, simulation state, communication events, decisions, assessment, and replay data.

The frontend is responsible for displaying the trainee-facing state and collecting trainee input.

During a live mission, the browser receives only the **trainee information state**.

Ground truth, assessment results, and the complete replay are released by the backend only at the appropriate stage.

---

## Project Structure

```text
PRAGYA/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── database/
│   ├── engine/
│   ├── models/
│   ├── scenarios/
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── api.js
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard
│   │   │   ├── Scenarios
│   │   │   ├── Training
│   │   │   ├── AAR
│   │   │   ├── Replay
│   │   │   └── Analytics
│   │   │
│   │   ├── components/
│   │   │   ├── Map
│   │   │   ├── InformationFeed
│   │   │   ├── DecisionPanel
│   │   │   ├── MissionTimeline
│   │   │   ├── StatusBar
│   │   │   ├── Sidebar
│   │   │   └── TopBar
│   │   │
│   │   └── lib/
│   │       ├── router
│   │       ├── formatting
│   │       └── map geometry
│   │
│   ├── package.json
│   └── .env.example
│
└── README.md
```

---

## API

The frontend communicates with the FastAPI backend through REST endpoints.

| UI Action          | Endpoint                                    |
| ------------------ | ------------------------------------------- |
| List scenarios     | `GET /api/scenarios`                        |
| View scenario      | `GET /api/scenarios/{id}`                   |
| Start mission      | `POST /api/missions`                        |
| Advance simulation | `POST /api/missions/{id}/tick`              |
| Get live state     | `GET /api/missions/{id}`                    |
| Submit decision    | `POST /api/missions/{id}/decision`          |
| Get AAR            | `GET /api/missions/{id}/aar`                |
| Get replay         | `GET /api/missions/{id}/replay?view=&tick=` |
| Get analytics      | `GET /api/analytics`                        |

During a live mission:

`GET /api/missions/{id}` returns the trainee-facing information state rather than exposing hidden ground truth.

After mission completion, the backend releases the appropriate AAR and replay information.

---

## Backend Additions

The current architecture includes two small but important additive backend changes.

### Scenario Asset Information

`scenarios.public()` returns:

```text
asset
```

This identifies which entity an order moves, allowing the frontend map to animate the correct asset.

### Asset Event Timing

`engine.asset_state()` returns:

```text
since
```

This identifies the tick of the latest asset event.

This allows the map to correctly display where an asset stopped when movement is interrupted.

---

## Frontend

The frontend is responsible for presentation and trainee interaction.

### Pages

* Dashboard
* Scenarios
* Training
* After-Action Review
* Replay
* Analytics

### Components

* Interactive Map
* Information Feed
* Decision Panel
* Mission Timeline
* Communication Status
* Status Bar
* Sidebar
* Top Bar
* Entity Details
* Replay Controls
* Assessment Panels
* Analytics Charts

### API Layer

All backend communication is centralized through:

```text
frontend/src/api.js
```

This keeps API calls separate from UI components.

---

## Technology Stack

### Frontend

* React 18
* Vite 5
* JavaScript
* CSS
* Hash Router
* Reusable component architecture

The prototype intentionally avoids unnecessary dependencies.

### Backend

* Python
* FastAPI
* Pydantic
* SQLite

The backend contains the simulation and assessment logic and acts as the authoritative source of mission state.

---

## Installation

### Prerequisites

Install:

* Python 3.11+
* Node.js
* npm
* Git

### 1. Start the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

### 2. Start the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

The Vite development server should use **port 5173**, which is included in the backend CORS configuration.

### Environment Configuration

To use another backend URL, create:

```text
frontend/.env
```

and configure:

```text
VITE_API_URL=http://127.0.0.1:8000
```

For a different frontend origin, configure the backend using:

```text
PRAGYA_CORS
```

See:

```text
frontend/.env.example
```

for the expected configuration.

---

## Scope

PRAGYA is a fictional decision-training and research prototype.

The scenarios are designed around **humanitarian relief and communication resilience**.

The project does not model:

* real-world military operations
* weapons employment
* targeting
* classified information
* real operational data

The objective is to study **decision-making under information uncertainty and communication degradation**.

---

## Design Philosophy

PRAGYA uses a professional operations-analysis interface rather than a conventional dashboard.

The visual language emphasizes:

* information clarity
* uncertainty
* communication status
* temporal awareness
* decision context
* analytical review

The interface distinguishes between:

* what the trainee knows
* what the trainee decides
* what actually happened
* why the information gap occurred

The goal is to make the reasoning behind a decision visible rather than simply displaying a final score.

---

## Future Extensions

Possible future development includes:

* additional communication scenarios
* instructor dashboard
* scenario authoring tools
* multiplayer training
* more advanced network models
* adaptive scenario difficulty
* larger-scale Monte Carlo analysis
* optional AI-assisted AAR narration
* additional training domains

These extensions can be added without changing the fundamental architecture.

---

## Project

**PRAGYA — Decision Training Simulator**

Developed as a prototype for the **Smart India Hackathon 2026** problem statement:

**SIH26248 — Immersive Multi-Domain Decision-Making Trainer for Degraded Communication Environments**

---

## Core Principle

> **The system knows what is happening. The trainee only knows what successfully reaches them.**

PRAGYA turns that information gap into something that can be **simulated, measured, replayed, and understood.**
