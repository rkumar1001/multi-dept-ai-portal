# TechYard Systems - AI Portal Demo Script

## Client Demo Guide | Logistics AI Agent

---

## Overview

This document contains a curated set of demo prompts for showcasing the **Logistics AI Agent** to clients. Each prompt is designed to use live, real-time data from connected integrations and produce impressive, actionable results.

### Connected Integrations

| Integration | Type | What It Provides |
|---|---|---|
| **FleetHunt** | GPS Tracking | Real-time vehicle locations, speed, ignition status, proximity search |
| **Samsara** | Fleet Management | Drivers, safety scores, HOS compliance, fuel, trips, idle reports, equipment, live maps, dashcam |
| **Gmail** | Communication | Search, read, send, reply, draft emails |
| **Slack** | Team Messaging | Channels, messages, send/reply *(if connected)* |
| **QuickBooks** | Financial | Vendors, bills, invoices, P&L reports *(if connected)* |
| **Weather** | External Data | Current conditions + 7-day forecast for any location |

---

## Round 1: Real-Time Fleet Intelligence (Single Integration)

> **Goal:** Show the client that the AI connects to live data and responds instantly with real numbers.

### Prompt 1 - Fleet Status Overview
```
Give me a full fleet status right now — how many trucks are moving, idle, and stopped?
```
**Uses:** FleetHunt
**Expected Output:** Real-time vehicle counts broken down by status with percentages

---

### Prompt 2 - Speeding Alerts
```
Which vehicles are currently speeding over 100 km/h? Show me their names, speed, and location.
```
**Uses:** FleetHunt
**Expected Output:** List of speeding vehicles with exact speeds and GPS locations

---

### Prompt 3 - Driver Safety Analysis
```
Show me all driver safety scores and highlight anyone with harsh braking or collision events in the last 24 hours.
```
**Uses:** Samsara
**Expected Output:** Driver safety rankings with specific event details (harsh braking, speeding, near-collisions)

---

### Prompt 4 - Compliance Monitoring
```
Are any of our drivers violating Hours of Service rules right now?
```
**Uses:** Samsara
**Expected Output:** Drivers exceeding HOS limits, violation type, hours driven

---

### Prompt 5 - Fuel & Idle Cost Analysis
```
Show me which vehicles burned the most fuel today and which ones were idling the longest.
```
**Uses:** Samsara
**Expected Output:** Fuel consumption rankings + idle time/fuel waste data

---

## Round 2: Cross-Platform Intelligence (Two Integrations)

> **Goal:** Show the AI can pull data from multiple systems and cross-reference them in a single answer.

### Prompt 6 - System Audit
```
Compare our fleet status from FleetHunt and Samsara — are all vehicles showing up in both systems? Flag any mismatches.
```
**Uses:** FleetHunt + Samsara
**Expected Output:** Side-by-side comparison with any discrepancies highlighted

---

### Prompt 7 - Smart Routing with Weather
```
Which trucks are sitting idle right now wasting fuel, and what's the weather like at their current locations? Should we reroute them?
```
**Uses:** Samsara + Weather
**Expected Output:** Idle vehicles + local weather conditions + AI-generated routing recommendations

---

### Prompt 8 - Location + Trip History
```
Find all vehicles currently near Toronto and show me their trip history for today — how far has each one driven?
```
**Uses:** FleetHunt + Samsara
**Expected Output:** Nearby vehicles with distance driven, fuel used, start/end locations

---

### Prompt 9 - Deep Driver Safety Dive
```
Show me drivers with the worst safety scores, then check what safety events they had today — harsh braking, speeding, anything.
```
**Uses:** Samsara (safety scores + safety events)
**Expected Output:** Worst-performing drivers with specific incident details and timestamps

---

### Prompt 10 - Proactive Maintenance Detection
```
Which of our vehicles are stopped right now and haven't moved in over 2 hours? Cross-check with Samsara for any maintenance alerts or engine fault codes.
```
**Uses:** FleetHunt + Samsara
**Expected Output:** Stopped vehicles flagged with any engine/maintenance issues from diagnostics

---

## Round 3: Full Workflow with Email (Three Integrations)

> **Goal:** Show the complete loop — detect an issue, analyze it, and take action (draft/send email) — all from one prompt.

### Prompt 11 - Compliance + Communication Audit
```
Check if any drivers are violating HOS rules, then search my email to see if we already notified anyone about compliance issues this week.
```
**Uses:** Samsara + Gmail
**Expected Output:** Current violations + email history showing whether alerts were already sent

---

### Prompt 12 - Auto-Generated Fleet Report Email
```
Show me our fleet summary, highlight any trucks that are idle or speeding, and draft an email to the operations team with today's fleet status report.
```
**Uses:** FleetHunt + Samsara + Gmail
**Expected Output:** Full fleet analysis + a professionally drafted email ready to send

---

### Prompt 13 - Fuel Efficiency Report + Email
```
Which vehicles had the most fuel consumption today, and draft an email to the fleet manager with a fuel efficiency report and recommendations to reduce costs.
```
**Uses:** Samsara + Gmail
**Expected Output:** Fuel data analysis + cost-saving recommendations in a ready-to-send email

---

### Prompt 14 - Safety Follow-Up Workflow
```
Find drivers with poor safety scores this week, check if we've emailed them about it before, and if not, draft a warning email to their manager.
```
**Uses:** Samsara + Gmail
**Expected Output:** Safety analysis + email audit + auto-drafted warning email

---

### Prompt 15 - End-of-Day Operations Report (THE CLOSER)
```
Give me a complete end-of-day fleet operations report — vehicles active, trips completed, fuel used, safety events, HOS violations — and email it to me.
```
**Uses:** FleetHunt + Samsara + Gmail
**Expected Output:** Comprehensive daily report combining all data sources + email delivery

---

## Bonus: Visual & Interactive

### Prompt 16 - Live Fleet Map
```
Show me all active live tracking map links so I can see the fleet on a map right now.
```
**Uses:** Samsara Live Shares
**Expected Output:** Clickable GPS map links for real-time fleet visualization

---

### Prompt 17 - Follow-Up Conversation (shows memory)
```
(After Prompt 1 or 2, in the same chat)
"Which of those idle trucks is closest to Vancouver? What's the weather there?"
```
**Uses:** FleetHunt + Weather
**Expected Output:** Shows the AI remembers previous context and can do proximity + weather analysis

---

## Demo Tips

### Presentation Order
1. Start with **Prompt 1** (fleet summary) — fast, real data, instant impact
2. Move to **Prompt 3** (driver safety) — shows depth of data
3. Show **Prompt 6** (cross-platform audit) — "it talks to multiple systems"
4. Show **Prompt 7** (idle + weather) — "it combines fleet data with external data"
5. Close with **Prompt 12 or 15** (full report + email) — "one question, complete workflow"
6. End with **Prompt 16** (live map) — visual wow factor

### Do's
- Let the response stream in real-time — the word-by-word appearance is impressive
- Point out the tool status indicators ("Using samsara_get_drivers..." etc.)
- Show the follow-up conversation (Prompt 17) to demonstrate contextual memory
- Let the AI ask for confirmation before sending emails — shows it's safe and controlled
- Use the sidebar integrations panel to show what's connected

### Don'ts
- Don't ask about "loads", "deliveries", or "clients" — FleetHunt is GPS-only, not a TMS
- Don't ask about dashcam "live" footage — only recorded clips are available via API
- Don't rush — let each response fully render before moving to the next prompt
- Don't use Slack prompts unless Slack is connected (check sidebar first)

### If Client Asks About Features Not Yet Built
| Question | Suggested Response |
|---|---|
| "Can it pull load/delivery data?" | "Yes, once we connect your TMS (Transportation Management System), the AI will cross-reference load data with GPS and driver info automatically." |
| "Can we see live camera feeds?" | "The system retrieves recorded dashcam footage on demand. Live streaming is on the roadmap pending Samsara API availability." |
| "Can it work with our accounting software?" | "QuickBooks integration is already built in. We can connect it and you'll be able to query invoices, bills, and P&L reports through the same chat." |
| "Can other departments use this?" | "Absolutely — the platform supports Sales, Finance, Accounting, and Restaurant departments, each with their own AI agent and integrations." |

---

## Integration-Specific Capabilities Reference

### FleetHunt (GPS Tracking)
| Capability | Example Prompt |
|---|---|
| Fleet overview | "How many trucks are on the road right now?" |
| Vehicle search | "Where is truck 349 right now?" |
| Moving vehicles | "Which vehicles are currently moving?" |
| Idle vehicles | "Which trucks have their engine on but aren't moving?" |
| Stopped vehicles | "Which trucks are parked and shut off?" |
| Proximity search | "Find all trucks within 50 km of Calgary" |
| Speeding detection | "Any vehicles going over 110 km/h?" |
| Live tracking | "Give me detailed tracking for vehicle 306" |

### Samsara (Fleet Management)
| Capability | Example Prompt |
|---|---|
| Vehicle diagnostics | "Show me engine stats and fuel levels for all vehicles" |
| Driver list | "List all our drivers and their assignments" |
| Safety scores | "Who are our safest and most dangerous drivers?" |
| Safety events | "Show me any harsh braking or near-miss events today" |
| HOS compliance | "Are any drivers close to exceeding their driving hours?" |
| HOS violations | "Show me all Hours of Service violations" |
| Fuel analysis | "Which trucks are the least fuel-efficient?" |
| Trip history | "Show me all trips completed in the last 24 hours" |
| Idle reports | "Which vehicles wasted the most fuel idling today?" |
| Equipment tracking | "Where are all our trailers right now?" |
| Live maps | "Show me live fleet tracking links" |
| Dashcam footage | "Get dashcam clips for vehicle 349 from yesterday" |

### Gmail
| Capability | Example Prompt |
|---|---|
| Search emails | "Search my emails for anything about maintenance this week" |
| Read emails | "Read me the latest email from the operations team" |
| Send email | "Send an email to john@company.com about today's fleet status" |
| Draft email | "Draft a fuel efficiency report email for the fleet manager" |
| Reply to email | "Reply to that email and let them know we're on it" |

### Weather
| Capability | Example Prompt |
|---|---|
| Current weather | "What's the weather in Calgary right now?" |
| Route weather | "What's the weather forecast for the Toronto-Montreal corridor?" |
| Planning | "Should we delay any shipments due to weather this week?" |

---

*Document prepared for TechYard Systems client demonstrations.*
*Last updated: April 2026*
