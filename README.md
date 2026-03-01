# Sentiment Aware Crypto Simulator

A full-stack cryptocurrency trading simulator with sentiment-aware signals and portfolio risk scenarios.

## Overview

This project combines:

- A Node.js + Express + MongoDB backend for auth, trading, portfolio, and market/sentiment APIs.
- A React frontend dashboard for simulated trading, charts, and risk visualization.
- Live external data from CoinGecko, CryptoCompare News, and Alternative.me Fear & Greed Index.

Users trade with virtual cash (starting balance: `$50,000`) and can evaluate how sentiment and stress scenarios affect portfolio outcomes.

## Tech Stack

- Backend: Node.js, Express 5, MongoDB, Mongoose, JWT, bcryptjs, Axios
- Frontend: React, react-router, axios, Chart.js, react-chartjs-2
- External APIs:
- CoinGecko (`/coins/markets`, `/market_chart`, `/simple/price`)
- CryptoCompare News (`/data/v2/news`)
- Alternative.me Fear & Greed (`/fng`)

## Project Structure

```text
Cryptosim/
|- server.js
|- middleware/
|  |- auth.js
|- models/
|  |- User.js
|  |- Portfolio.js
|  |- Transaction.js
|- routes/
|  |- auth.js
|  |- market.js
|  |- trade.js
|  |- sentiment.js
|- client/
|  |- src/
|  |- public/
```

## Prerequisites

- Node.js 18+
- npm
- MongoDB (local or Atlas)

## Environment Variables

Create a `.env` file in the root folder:

```env
MONGO_URI=mongodb://localhost:27017/crypto_platform
JWT_SECRET=replace_with_a_strong_secret
PORT=5000
NODE_ENV=development
```

## Installation

From project root:

```bash
npm install
```

For frontend:

```bash
cd client
npm install
```

## Running Locally

Run backend (from root):

```bash
node server.js
```

Run frontend (in another terminal):

```bash
cd client
npm start
```

Frontend runs on `http://localhost:3000` and expects backend at `http://localhost:5000`.

## Main API Endpoints

### Auth

- `POST /api/auth/register` - Register user and create portfolio
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get logged-in user + portfolio (Bearer token required)

### Market

- `GET /api/market/prices` - Top market prices (cached)
- `GET /api/market/chart/:id` - 7-day chart for a coin
- `GET /api/market/fear-greed` - Fear & Greed index

### Trade

- `POST /api/trade/order` - Execute `BUY`/`SELL` order (Bearer token required)
- `GET /api/trade/history` - Last 20 user transactions (Bearer token required)

### Sentiment

- `GET /api/sentiment/hype` - Aggregate VADER-style market sentiment
- `GET /api/sentiment/coin/:symbol` - Coin-specific sentiment and signal
- `GET /api/sentiment/history` - Historical sentiment points for chart overlays

## Features

- JWT auth with protected routes
- Portfolio and transaction tracking in MongoDB
- Server-side trade execution using live prices
- VADER-style sentiment scoring with crypto lexicon, negation, and intensifier handling
- Cached API responses to reduce rate limit pressure
- Dashboard with charts, widgets, and stress-test scenarios

## Notes

- This is a simulation platform. No real funds are used.
- Some routes depend on third-party APIs and may return fallback values when providers are unavailable.

## License

ISC
