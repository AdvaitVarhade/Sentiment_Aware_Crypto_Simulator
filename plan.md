Personal Project Implementation Plan & Development Log

Project Title: Sentiment-Aware Cryptocurrency Trading & Risk Simulation Platform
Developer: Advait Ravindrakumar Varhade
Document Type: Internal Working Document (Not for Submission)

1. Project Overview & Features

(Unchanged from previous version)

2. Progress Dashboard

Phase 1: Planning & Analysis (DONE)

[x] Topic Selection & Scope Definition

[x] Literature Survey

[x] SRS Document (v1.0 Approved)

[x] Process Model Selection (Incremental)

[x] Project Scheduling (Gantt Chart & WBS)

[x] System Modeling (ER Diagram, DFDs, Use Case Diagram)

Phase 2: Increment 1 - Core Platform (IN PROGRESS)

[x] Repo Setup: Initialize Git, Create Client/Server folders.

[x] Database Setup: Defined Mongoose Schemas (User, Portfolio, Transaction).

[x] Backend Auth: Write Login/Register APIs (Node/Express) using JWT & bcrypt.

[x] Auth Middleware: Implemented JWT verification (protect middleware) for secure routes.

[ ] Frontend Setup: React Init, Login Page, Dashboard Layout.

[ ] Market Bridge: Fetch & Display CoinGecko prices on Frontend.

[ ] Trading Logic: Implement Buy/Sell API & DB updates.

Phase 3: Increment 2 - Sentiment Intelligence

[ ] News Bridge: Connect CryptoPanic API.

[ ] NLP Logic: Write the function to count keywords in headlines.

[ ] UI Integration: Add the "Hype Meter" component to the Dashboard.

Phase 4: Increment 3 - Risk & Optimization

[ ] Math Logic: Implement Portfolio % Drop formulas.

[ ] Doomsday UI: Create the Scenario Selection screen.

3. Detailed Development Steps (The "How-To")

(Currently transitioning to Step 3 / Market Data & APIs)

4. Development Change Log (My Dev Diary)

Date

Component

Change Description / Action Taken

Challenges / Bugs

Solution / Fix

Jan 15

Architecture

Finalized ERD/DFDs. Added "Order Book".

Confusion on Weak Entities.

Used Chen notation.

Feb 19

Architecture

Finalized Use Case Diagram

Needed to show enterprise logic

Added Payment Gateway & Error extensions.

Feb 19

Backend

Initialized Express server.js and connected to MongoDB.

Mongoose 6+ deprecation warning crash.

Removed useNewUrlParser & useUnifiedTopology options.

Feb 19

Database

Created User, Portfolio, and Transaction Mongoose models.

Ensuring Portfolio doesn't duplicate per user.

Added unique index on user field in PortfolioSchema.

Feb 19

Auth System

Built /api/auth/register and /api/auth/login

Passwords stored in plain text.

Added bcryptjs hashing.

Feb 19

Auth System

Automated Portfolio generation on user signup.

Users had no portfolio to attach trades to.

Added Portfolio.create() inside the register route.

Feb 19

Auth System

Created JWT protect middleware and /api/auth/me route.

APIs were exposed and insecure.

Implemented Bearer token header verification.

Feb 20

Auth Middleware

GET /api/auth/me returned 404 Not Found despite route being defined.

Server was never restarted after adding /me route — Node.js loads files into memory at startup and does not hot-reload.

Killed the running node process and restarted with node server.js. Route resolved correctly.

Feb 20

Auth Middleware

GET /api/auth/me returned "Not authorized, token failed" even with a valid token in some edge cases.

middleware/auth.js was missing return statements before next() and res.status() calls. In Express async middleware, code continues executing after these calls, risking double-response errors ("Cannot set headers after they are sent").

Added return before next(), return before the catch block's res.status(401), and return before the no-token res.status(401). Verified with Thunder Client — 200 response returns correct user + empty portfolio.

5. Technical Cheat Sheet & Reference

(Unchanged from previous version)