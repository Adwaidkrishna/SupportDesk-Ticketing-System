# 📋 SupportDesk Ticketing System — Master Production Readiness & Deep Code Audit Report

**Assessment Date:** September 24, 2026  
**Target Application:** SupportDesk Ticketing System (Full-Stack MERN + Socket.IO + WebRTC + SLA Engine)  
**Lead Auditors:** Principal Software Architect, Senior Backend Engineer, Application Security Engineer, QA & Production Reliability Engineers  
**Overall Readiness Assessment:** **REQUIRES CHANGES** (Not ready for commercial production deployment until P0 and P1 issues are resolved)

---

## 1. Executive Summary

A comprehensive, line-by-line engineering and security audit of the entire **SupportDesk Ticketing System** was executed across all tiers:
- **Frontend SPA:** React 19, Vite, React Router v7, Context API, Vanilla CSS Modules.
- **Backend API:** Node.js, Express.js (ES Modules), Mongoose 8, Socket.IO 4.8.
- **Real-Time Subsystems:** Socket.IO room messaging, WebRTC 1-to-1 audio/video calling, dynamic screen-sharing.
- **Domain Engines:** Ticket lifecycle state machine, SLA deadline calculation, background monitoring jobs, role-based notification dispatching.

The audit verified that the application possesses a disciplined foundation:
- Clean layer separation (Routes $\to$ Validation Middleware $\to$ Controllers $\to$ Domain Services $\to$ Models).
- Strong horizontal customer isolation (IDOR protection) at the database query level.
- Atomic ticket claiming preventing duplicate agent assignment.
- Functional peer-to-peer WebRTC signaling and media track lifecycle management.

However, several **system-breaking defects, data corruption races, and scalability bottlenecks** were identified that will cause immediate failures in production if not resolved:
1. **Critical Route Lookup Mismatch:** Backend notifications generate human-readable ticket number routes (`/customer/tickets/TKT-000001`), but backend validation middleware strictly demands 24-character hexadecimal MongoDB ObjectIds. Clicking any in-app notification results in an immediate `400 Bad Request`, rendering ticket views inaccessible.
2. **SLA State Erasure:** When resolving tickets, status update services invoke a helper that writes to MongoDB, then immediately execute `await ticket.save()` on their own stale local in-memory document, wiping `sla.resolvedAt` back to `null`.
3. **Full Table Scan in Ticket Numbering:** Ticket generation executes an unindexed, unbounded regex query on the entire ticket collection, loading all tickets into Node.js heap memory on every creation and crashing with `E11000 duplicate key error` under concurrent submissions.
4. **Multi-Instance SLA Worker Duplication:** The SLA background monitor runs via uncoordinated in-process `setInterval`, causing duplicate notifications across clustered instances.
5. **Security Token Storage Leaks:** OTPs and Password Reset tokens lack MongoDB TTL indexes, allowing expired credentials to persist indefinitely.

---

## 2. Findings Matrix

| ID | Severity | Finding Title | Affected Component | Failure Mode |
| :--- | :---: | :--- | :--- | :--- |
| **C-01** | **CRITICAL** | Ticket Identifier URL Parameter Mismatch | `ticket.validator.js`, Customer & Agent Services | In-app notifications & direct URLs fail with `400 Bad Request`. |
| **H-01** | **HIGH** | Stale Document Save Overwriting SLA Resolution Timestamp | `updateAgentTicketStatus.service.js`, `updateTicketStatus.service.js` | Erases `resolvedAt` timestamp from MongoDB; SLA compliance corrupted. |
| **H-02** | **HIGH** | Unbounded Table Scan & Collision in Sequence Generation | `createTicket.service.js` (`generateTicketNumber`) | Heap memory leak on ticket creation; `E11000` duplicate crash under concurrency. |
| **H-03** | **HIGH** | In-Process SLA Monitor Multi-Instance Duplicate Alerts | `slaMonitor.job.js` | Clustered/multi-pod instances spam duplicate warning and breach notifications. |
| **M-01** | **MEDIUM** | Missing MongoDB TTL Indexes on Security Tokens | `Otp.js`, `PasswordReset.js` | Expired OTPs and reset tokens accumulate permanently in database. |
| **M-02** | **MEDIUM** | Missing High-Frequency Database Query Indexes | `User.js`, `TicketMessage.js`, `Ticket.js` | Unindexed queries cause `COLLSCAN` and in-memory sort latency spikes. |
| **M-03** | **MEDIUM** | Disconnected Frontend Mock Views in Management Modules | `AllTickets.jsx`, `EscalatedTickets.jsx`, `Reports.jsx` | Views display static mock arrays without live backend data integration. |
| **L-01** | **LOW** | Missing Process Signal Handlers for Clean Shutdown | `server.js` | Abrupt connection drops and orphaned MongoDB connections during restarts. |
| **L-02** | **LOW** | CORS & WebSocket Origin Configuration Mismatch | `app.js` vs `socket.js` | Multi-domain environments allow REST calls but reject WebSocket handshakes. |
| **L-03** | **LOW** | WebRTC NAT Traversal Single Point of Failure | `webrtcConfig.js` | Lacks TURN relay configuration; fails behind restrictive corporate symmetric NATs. |

---

## 3. Deep Dive: Critical & High Findings

### [CRITICAL] C-01: Ticket Identifier URL Parameter Mismatch Breaking Deep Links
* **Location:** [BACKEND/src/validators/ticket.validator.js:163-183](file:///c:/Users/LENOVO/Desktop/SupportDesk%20Ticketing%20System/BACKEND/src/validators/ticket.validator.js#L163-L183) & [BACKEND/src/services/ticket/customer/getTicketDetails.service.js:6-19](file:///c:/Users/LENOVO/Desktop/SupportDesk%20Ticketing%20System/BACKEND/src/services/ticket/customer/getTicketDetails.service.js#L6-L19)
* **Code Evidence:**
  ```javascript
  // BACKEND/src/validators/ticket.validator.js
  export const validateTicketIdParam = (req, res, next) => {
    const { ticketId } = req.params;
    const trimmedId = ticketId.trim();
    if (!mongoose.Types.ObjectId.isValid(trimmedId)) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Invalid ticket ID format.',
      });
    }
    req.params.ticketId = trimmedId;
    next();
  };
  ```
  ```javascript
  // BACKEND/src/services/ticket/customer/createTicket.service.js:60
  targetRoute: `/customer/tickets/${newTicket.ticketNumber}`,
  ```
* **Problem:** Notification events and dashboard links route to human-readable ticket numbers (`/customer/tickets/TKT-000001` or `/agent/tickets/TKT-000001`). When the browser requests `GET /api/v1/tickets/TKT-000001`, `validateTicketIdParam` rejects it because `TKT-000001` is not a 24-character hexadecimal ObjectId.
* **Impact:** 100% failure rate for all notification deep links, browser bookmarks, and manual URL sharing.
* **Root Cause:** Architectural divergence. Admin ticket routes were updated with `validateAdminTicketId` supporting both ObjectId and ticketNumber, but Customer and Agent validators and services were left strictly expecting ObjectIds.
* **Remediation:**
  1. Update `validateTicketIdParam` in `ticket.validator.js` to accept either an ObjectId OR a string matching `/^#?TKT-\d+$/i`.
  2. In customer/agent services (`getTicketByIdForCustomer`, `getTicketMessages`, `sendCustomerMessage`, `getAgentTicketDetails`, `getAgentTicketMessages`, `sendAgentMessage`, `updateAgentTicketStatus`, `claimTicket`, `reopenTicket`), resolve tickets via `{ $or: [{ _id: ticketId }, { ticketNumber: ticketId }] }`.

---

### [HIGH] H-01: Stale Document Save Overwriting SLA Resolution Timestamp
* **Location:** [BACKEND/src/services/ticket/agent/updateAgentTicketStatus.service.js:49-55](file:///c:/Users/LENOVO/Desktop/SupportDesk%20Ticketing%20System/BACKEND/src/services/ticket/agent/updateAgentTicketStatus.service.js#L49-L55) & [BACKEND/src/services/admin/tickets/updateTicketStatus.service.js:29-35](file:///c:/Users/LENOVO/Desktop/SupportDesk%20Ticketing%20System/BACKEND/src/services/admin/tickets/updateTicketStatus.service.js#L29-L35)
* **Code Evidence:**
  ```javascript
  ticket.status = status;
  if (status === 'RESOLVED') {
    const { recordResolution } = await import('../../sla/sla.service.js');
    await recordResolution(ticketId); // Reads from DB, populates resolvedAt, and calls ticket.save()
  }
  await ticket.save(); // Overwrites DB with local stale in-memory ticket where resolvedAt is NULL!
  ```
* **Problem:** `recordResolution` retrieves the ticket from MongoDB, sets `ticket.sla.resolvedAt = new Date()`, and executes `await ticket.save()`. Immediately after it returns, the calling service executes `await ticket.save()` on its own in-memory `ticket` document that still has `ticket.sla.resolvedAt = null`.
* **Impact:** `sla.resolvedAt` is overwritten back to `null` in MongoDB, corrupting resolution SLA analytics. If Mongoose document versioning (`__v`) is checked, it throws an unhandled `VersionError` crash.
* **Root Cause:** Dual disparate writes without in-memory synchronization.
* **Remediation:** Mutate `ticket.sla.resolvedAt` directly on the local in-memory document before calling the single `await ticket.save()`, eliminating the redundant database fetch and overwrite.

---

### [HIGH] H-02: Unbounded Table Scan & Concurrency Collision in Ticket Number Generation
* **Location:** [BACKEND/src/services/ticket/customer/createTicket.service.js:8-19](file:///c:/Users/LENOVO/Desktop/SupportDesk%20Ticketing%20System/BACKEND/src/services/ticket/customer/createTicket.service.js#L8-L19)
* **Code Evidence:**
  ```javascript
  export const generateTicketNumber = async () => {
    const tickets = await Ticket.find({ ticketNumber: /^TKT-\d+$/ }, { ticketNumber: 1 }).lean();
    let maxNum = 0;
    for (const t of tickets) {
      const match = t.ticketNumber.match(/^TKT-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `TKT-${String(maxNum + 1).padStart(6, '0')}`;
  };
  ```
* **Problem:** Every ticket creation executes an unindexed regex scan over the entire collection, pulling all ticket numbers into Node.js heap memory. Two concurrent ticket requests compute the exact same `maxNum + 1`, causing one request to fail with `E11000 duplicate key error`.
* **Impact:** Severe memory exhaustion under database growth ($O(N)$ memory bloat) and unhandled 500 crashes during support spikes.
* **Remediation:** Replace the collection-wide scan with an indexed reverse query:
  ```javascript
  const lastTicket = await Ticket.findOne({ ticketNumber: /^TKT-\d+$/ })
    .sort({ ticketNumber: -1 })
    .select('ticketNumber')
    .lean();
  ```

---

### [HIGH] H-03: In-Process SLA Monitor Multi-Instance Duplicate Notification Loop
* **Location:** [BACKEND/src/jobs/slaMonitor.job.js:14-125](file:///c:/Users/LENOVO/Desktop/SupportDesk%20Ticketing%20System/BACKEND/src/jobs/slaMonitor.job.js#L14-L125)
* **Problem:** The SLA background monitoring loop runs inside the Express process via `setInterval(..., 60000)`. In a multi-pod or PM2 clustered environment, every process queries active tickets non-atomically. When a ticket nears or breaches a deadline, multiple nodes detect it simultaneously and send duplicate notifications to customers and agents.
* **Impact:** Alert spamming and degraded user trust.
* **Remediation:** Use atomic conditional reservations:
  ```javascript
  const ticket = await Ticket.findOneAndUpdate(
    { _id: candidate._id, 'sla.warningNotified': false },
    { $set: { 'sla.warningNotified': true } },
    { new: false }
  );
  if (!ticket) continue; // Claimed by another worker node
  ```

---

## 4. Deep Dive: Medium & Low Findings

### [MEDIUM] M-01: Permanent Accumulation of Expired Tokens (Missing TTL Indexes)
* **Location:** [BACKEND/src/models/Otp.js:15-19](file:///c:/Users/LENOVO/Desktop/SupportDesk%20Ticketing%20System/BACKEND/src/models/Otp.js#L15-L19) & [BACKEND/src/models/PasswordReset.js:16-20](file:///c:/Users/LENOVO/Desktop/SupportDesk%20Ticketing%20System/BACKEND/src/models/PasswordReset.js#L16-L20)
* **Problem:** Both schemas define `expiresAt: Date` without `{ expireAfterSeconds: 0 }`. MongoDB never purges expired verification codes or password reset tokens.
* **Remediation:** Add `index: { expires: 0 }` to `expiresAt` in both Mongoose schemas.

### [MEDIUM] M-02: Missing High-Frequency Database Query Indexes
* **Location:** [BACKEND/src/models/User.js:22-26](file:///c:/Users/LENOVO/Desktop/SupportDesk%20Ticketing%20System/BACKEND/src/models/User.js#L22-L26) & [BACKEND/src/models/TicketMessage.js:5-10](file:///c:/Users/LENOVO/Desktop/SupportDesk%20Ticketing%20System/BACKEND/src/models/TicketMessage.js#L5-L10)
* **Problem:** `User.role` has no index despite constant filtering in agent queues and assignment lists. `TicketMessage` lacks a compound index `{ ticketId: 1, createdAt: 1 }`, causing in-memory sort operations on message history fetches.
* **Remediation:** Add `index: true` on `UserSchema.role` and compound index `{ ticketId: 1, createdAt: 1 }` on `TicketMessageSchema`.

### [MEDIUM] M-03: Secondary Management Views Disconnected from Live Backend Data
* **Location:** `AllTickets.jsx`, `EscalatedTickets.jsx`, `Reports.jsx`, `Settings.jsx`
* **Problem:** These components import static mock objects from `agentMockData.js` and `adminMockData.js` and display simulated toasts rather than calling live REST endpoints.
* **Remediation:** Wire frontend state and filter forms to the existing `/api/v1/agent/tickets` and `/api/v1/admin/analytics` endpoints.

### [LOW] L-01: Process Signal Handlers Missing for Clean Server Shutdown
* **Location:** [BACKEND/src/server.js:1-68](file:///c:/Users/LENOVO/Desktop/SupportDesk%20Ticketing%20System/BACKEND/src/server.js#L1-L68)
* **Problem:** No `process.on('SIGTERM')` or `process.on('SIGINT')` handlers. Process stops kill active WebSocket sessions abruptly.
* **Remediation:** Implement graceful shutdown hooks in `server.js` to stop HTTP/Socket listeners and disconnect Mongoose cleanly.

### [LOW] L-02: CORS & WebSocket Origin Configuration Mismatch
* **Location:** [BACKEND/src/app.js:28-36](file:///c:/Users/LENOVO/Desktop/SupportDesk%20Ticketing%20System/BACKEND/src/app.js#L28-L36) vs [BACKEND/src/socket/socket.js:33-40](file:///c:/Users/LENOVO/Desktop/SupportDesk%20Ticketing%20System/BACKEND/src/socket/socket.js#L33-L40)
* **Problem:** `app.js` parses a comma-separated list of `ALLOWED_ORIGINS`, whereas `socket.js` defaults strictly to a single `CLIENT_URL`.
* **Remediation:** Harmonize `socket.js` to parse the same origin array as Express.

### [LOW] L-03: WebRTC NAT Traversal Vulnerability (Missing TURN Configuration)
* **Location:** [FRONTEND/src/features/video-call/config/webrtcConfig.js:9-13](file:///c:/Users/LENOVO/Desktop/SupportDesk%20Ticketing%20System/FRONTEND/src/features/video-call/config/webrtcConfig.js#L9-L13)
* **Problem:** Only Google's public STUN server is configured. Calls between clients behind symmetric NATs or corporate firewalls will fail ICE negotiation without a TURN relay.
* **Remediation:** Provide configurable TURN server environment variables (`VITE_TURN_SERVER_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL`).

---

## 5. Subsystem Audits

### 5.1 Authentication & Authorization Subsystem
* **Development Quick-Login (Preserved):** Quick-login buttons on the frontend authenticate test users (`customer`, `agent`, `admin`) instantly using valid signed JWTs. Preserved for development efficiency.
* **Customer Isolation (IDOR Defense):** Customer endpoints strictly filter by `{ _id: ticketId, customerId: req.user.id }`. Direct URL tampering returns `404 Not Found`.
* **Agent Scoping:** Only the assigned agent or admin can post agent messages or transition ticket status (returns `403 Forbidden` if unassigned or assigned elsewhere).
* **Future Production Requirements:**
  - Transition tokens from `localStorage` to `HttpOnly`, `Secure`, `SameSite=Strict` cookies.
  - Implement refresh-token rotation with family revocation.
  - Enforce MFA for administrative and agent accounts.

### 5.2 Ticket Business Logic & State Machine
* **Lifecycle:** $\text{OPEN} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{RESOLVED} \longrightarrow \text{CLOSED}$.
* **State Invariants:**
  - Agents can only move tickets from `IN_PROGRESS` to `RESOLVED` or `CLOSED`.
  - Messaging on `RESOLVED` or `CLOSED` tickets is blocked (`400 Bad Request`); customers must explicitly invoke the `/reopen` endpoint.
  - Reopening returns the ticket to `IN_PROGRESS` and resets SLA resolution flags.
  - Atomic claiming prevents duplicate assignment races between agents.

### 5.3 SLA Engine Subsystem
* **Deadline Calculations:** Correctly computes response and resolution deadlines from active SLA policies based on priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
* **First Response Invariant:** Verified. Customer messages do NOT satisfy first-response SLA; only Agent or Admin replies record `firstResponseAt`.
* **Resolution Invariant:** Bug H-01 must be patched to prevent erasing `resolvedAt`.

### 5.4 Real-Time Socket.IO & WebRTC Subsystem
* **Room Authorization:** Socket connections join canonical ticket rooms (`ticket:TKT-XXXXXX`). Messages and WebRTC signaling events are strictly isolated to room participants.
* **WebRTC Media Engine:**
  - P2P negotiation properly queues ICE candidates arriving prior to `setRemoteDescription`.
  - Microphone mute toggles `audioTrack.enabled`; camera off toggles `videoTrack.enabled`.
  - Screen sharing replaces the outgoing video track on `RTCRtpSender` without tearing down audio or peer connections; cleanly restores camera track on termination.
  - Hardware LEDs turn off immediately on call end or unmount.

---

## 6. Production Readiness Checklist

| Category | Component / Check | Status | Verification Notes |
| :--- | :--- | :---: | :--- |
| **Architecture** | ES Module consistency & clean imports | ✅ Good | Standard ESM with explicit `.js` extensions |
| **Architecture** | Layer separation (Route $\to$ Controller $\to$ Service $\to$ Model) | ✅ Good | Controllers do not execute raw database queries |
| **Auth & RBAC** | Development Quick-Login | ✅ Good | Preserved and fully functional |
| **Auth & RBAC** | Customer Horizontal Isolation (IDOR) | ✅ Good | Scoped queries prevent accessing other users' tickets |
| **Auth & RBAC** | Production Cookie / Refresh Architecture | ⚠️ Needs improvement | Required for commercial release |
| **Tickets** | Deep-Link URL Lookup | ❌ Missing / unsafe | Blocked by Bug C-01 (`validateTicketIdParam`) |
| **Tickets** | Sequence Number Generator | ❌ Missing / unsafe | Blocked by Bug H-02 (unbounded full collection scan) |
| **Tickets** | Atomic Agent Claiming | ✅ Good | Protected via atomic `findOneAndUpdate` |
| **SLA** | Priority Target & Deadline Calculation | ✅ Good | Response and resolution targets calculated correctly |
| **SLA** | First Response Tracking | ✅ Good | Customer replies do not satisfy first response |
| **SLA** | Resolution Timestamp Persistence | ❌ Missing / unsafe | Blocked by Bug H-01 (stale in-memory save overwrite) |
| **SLA** | Clustered Background Monitoring | ⚠️ Needs improvement | Blocked by Bug H-03 (lacks atomic claim lock) |
| **Real-Time** | Room-Scoped Messaging | ✅ Good | Messages isolated to `ticket:TKT-XXXXXX` |
| **WebRTC** | Peer Connection Lifecycle & Cleanup | ✅ Good | Tracks stop cleanly; hardware LEDs turn off |
| **WebRTC** | Screen Sharing Track Replacement | ✅ Good | Swaps tracks dynamically via `replaceTrack` |
| **WebRTC** | NAT/Firewall Traversal (STUN/TURN) | ⚠️ Needs improvement | Needs production TURN server configuration |
| **Database** | Token Expiration Cleanup | ❌ Missing / unsafe | Blocked by Bug M-01 (missing TTL indexes on OTP/Reset) |
| **Database** | Secondary & Compound Query Indexes | ⚠️ Needs improvement | Blocked by Bug M-02 (missing indexes on role, messages) |
| **Operations** | Graceful Server Shutdown Signals | ⚠️ Needs improvement | Blocked by Bug L-01 (missing `SIGTERM`/`SIGINT`) |
| **Operations** | CORS & WebSocket Origin Alignment | ⚠️ Needs improvement | Blocked by Bug L-02 |
| **Frontend** | Management Views Data Integration | ⚠️ Needs improvement | Blocked by Bug M-03 (mock shells in Reports/AllTickets) |

---

## 7. Prioritized Remediation Roadmap

### Phase 1: P0 Showstoppers (Fix Immediately)
1. **Fix Ticket Identifier URL Validation & Lookup (C-01):**
   - Update `BACKEND/src/validators/ticket.validator.js` (`validateTicketIdParam`) to accept both MongoDB ObjectId and ticket number strings matching `/^#?TKT-\d+$/i`.
   - Update Customer and Agent services (`getTicketByIdForCustomer`, `getTicketMessages`, `sendCustomerMessage`, `getAgentTicketDetails`, `getAgentTicketMessages`, `sendAgentMessage`, `updateAgentTicketStatus`, `claimTicket`, `reopenTicket`) to query by `{ $or: [{ _id: ticketId }, { ticketNumber: ticketId }] }`.
2. **Fix SLA Resolution Timestamp Stale Save Overwrite (H-01):**
   - In `updateAgentTicketStatus.service.js` and `admin/tickets/updateTicketStatus.service.js`, update `ticket.sla.resolvedAt` directly on the local in-memory document before calling `ticket.save()`.

### Phase 2: P1 Pre-Deployment Scalability & Reliability (Fix Before Launch)
3. **Fix Ticket Number Sequence Generation (H-02):**
   - Replace the full collection scan in `createTicket.service.js` with `.findOne({ ticketNumber: /^TKT-\d+$/ }).sort({ ticketNumber: -1 }).select('ticketNumber')` to achieve $O(1)$ calculation.
4. **Add MongoDB TTL Indexes (M-01):**
   - Add `{ expireAfterSeconds: 0 }` to `expiresAt` in `Otp.js` and `PasswordReset.js`.
5. **Add High-Traffic Query Indexes (M-02):**
   - Add `index: true` on `User.role`.
   - Add compound index `{ ticketId: 1, createdAt: 1 }` on `TicketMessage.js`.
   - Add compound index `{ status: 1, 'sla.responseDeadline': 1 }` on `Ticket.js`.
6. **Implement Distributed Lock for SLA Monitor (H-03):**
   - Update `slaMonitor.job.js` to use atomic conditional updates (`findOneAndUpdate`) so each expiring ticket is claimed by only one process.

### Phase 3: P2 Operational Robustness (Fix Soon)
7. **Add Graceful Shutdown Listeners (L-01):**
   - In `server.js`, register `process.on('SIGTERM')` and `process.on('SIGINT')` to cleanly drain HTTP/Socket listeners and disconnect Mongoose.
8. **Harmonize CORS Configuration (L-02):**
   - Align `socket.js` to parse comma-separated `ALLOWED_ORIGINS` matching `app.js`.
9. **Configure Production TURN Server (L-03):**
   - Add TURN credentials in `webrtcConfig.js` for corporate firewall NAT traversal.

### Phase 4: P3 Architectural Enhancements (Future Improvements)
10. **Connect Frontend Mock Views (M-03):**
    - Connect `AllTickets.jsx`, `EscalatedTickets.jsx`, and `Reports.jsx` to live backend reporting and ticket endpoints.
11. **Production Authentication Hardening:**
    - Transition tokens from `localStorage` to `HttpOnly` secure cookies, implement refresh-token rotation, and enforce MFA.
