# Sentiment-Aware Cryptocurrency Trading Simulator

A full-stack platform integrating live market data, news-derived sentiment analysis, behavioral fear-and-greed indicators, virtual paper trading execution, portfolio analytics, and configurable strategy backtesting. This provides a realistic yet risk-free environment for experimenting with crypto markets.

## Key Features

- **Live Market Data**: Real-time coin prices and historical charts (CoinGecko).
- **Sentiment Intelligence**: Crypto news analysis and market mood indicators (CryptoPanic).
- **Paper Trading**: Virtual buy/sell execution with transaction persistence.
- **Portfolio Analytics**: Track invested capital, unrealized PnL, and historical valuation curves.
- **Strategy Backtesting**: Test configurations combining sentiment, momentum, and psychology signals against benchmarks.

## System Architecture

```mermaid
graph TD
    subgraph Frontend
        Dashboard[Trading Dashboard]
        StrategyLab[Strategy & Backtesting Lab]
        Analytics[Portfolio Analytics]
    end

    subgraph Backend - Node.js
        API[Express API]
        Auth[JWT Authentication]
        Trade[Trade Execution Engine]
        SentimentAnalyzer[Sentiment Analysis Module]
    end

    subgraph Data Stores
        MongoDB[(MongoDB <br> Users, Portfolios, Transactions)]
    end

    subgraph External APIs
        CoinGecko[CoinGecko API <br> Market Data]
        CryptoPanic[CryptoPanic API <br> News]
    end

    Dashboard --> API
    StrategyLab --> API
    Analytics --> API

    API --> Auth
    API --> Trade
    API --> SentimentAnalyzer

    Trade --> MongoDB
    Auth --> MongoDB

    SentimentAnalyzer --> CryptoPanic
    Trade --> CoinGecko
```

## Screenshots

<p align="center">
  <img src="screenshots/dashboard.png" width="45%" alt="Trading Dashboard" />
  <img src="screenshots/portfolio.png" width="45%" alt="Portfolio Analytics" />
  <img src="screenshots/backtest.png" width="45%" alt="Strategy Backtesting" />
</p>

## Tech Stack

- **Frontend**: React, Chart.js
- **Backend**: Node.js, Express
- **Database**: MongoDB (Mongoose)
- **Security**: JWT Authentication, bcrypt, Express Rate Limit
