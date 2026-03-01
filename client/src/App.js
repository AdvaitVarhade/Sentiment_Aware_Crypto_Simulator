import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { AuthContext } from './context/AuthContext';
import {
    CoinSentimentBadge, WidgetCard, useDragResize,
    WIDGETS, DEFAULT_LAYOUT, loadLayout, loadVisible,
    AllocationWidget, DominanceWidget, VolumeBarWidget,
    HeatmapWidget, PnlGaugeWidget, SentimentRadarWidget
} from './Dashboard';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// --- AUTH PAGE ---
const AuthPage = ({ isLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const { login, register, error } = useContext(AuthContext);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLogin) await login(email, password);
        else await register(name, email, password);
    };

    return (
        <div style={styles.authContainer}>
            <div style={styles.authBg} />
            <div style={styles.authCard}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #c0f241, #7ecb0f)', borderRadius: '6px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px' }}>âš¡</div>
                    <h2 style={{ color: '#fff', margin: 0, fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>Flux<span style={{fontWeight: '300', color: '#a0aec0'}}>Capital</span></h2>
                </div>
                <p style={{ color: '#4a5568', textAlign: 'center', marginBottom: '30px', fontSize: '13px' }}>Real-time crypto trading simulator</p>
                <h3 style={{ color: '#e2e8f0', textAlign: 'center', marginBottom: '25px', fontWeight: '500', fontSize: '16px' }}>
                    {isLogin ? 'ðŸ‘‹ Welcome back' : 'ðŸš€ Create your account'}
                </h3>
                {error && <div style={styles.error}>{error}</div>}
                <form onSubmit={handleSubmit} style={styles.form}>
                    {!isLogin && (
                        <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required style={styles.input} />
                    )}
                    <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required style={styles.input} />
                    <div style={{ position: 'relative' }}>
                        <input type={showPass ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{...styles.input, paddingRight: '50px'}} />
                        <button type="button" onClick={() => setShowPass(p => !p)}
                            style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#718096', cursor: 'pointer', fontSize: '16px' }}>
                            {showPass ? 'ðŸ™ˆ' : 'ðŸ‘ï¸'}
                        </button>
                    </div>
                    <button type="submit" style={styles.actionBtn}>{isLogin ? 'Sign In' : 'Create Account'}</button>
                </form>
                <p style={{ marginTop: '20px', textAlign: 'center', color: '#718096', fontSize: '14px' }}>
                    {isLogin ? 'No account? ' : 'Already registered? '}
                    <Link to={isLogin ? '/register' : '/login'} style={styles.link}>{isLogin ? 'Register here' : 'Login here'}</Link>
                </p>
            </div>
        </div>
    );
};

// --- VIEW 1: DASHBOARD (Widget Grid) ---
const Dashboard = () => {
    const { user, authAxios, portfolio } = useContext(AuthContext);
    const [marketData, setMarketData] = useState([]);
    const [sentimentData, setSentimentData] = useState(null);
    const [fearGreed, setFearGreed] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeChartCoin, setActiveChartCoin] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [loadingChart, setLoadingChart] = useState(false);
    const [sentimentHistory, setSentimentHistory] = useState([]);
    const sentimentHistoryRef = useRef([]);
    const [tradeModalCoin, setTradeModalCoin] = useState(null);
    const [tradeQuantity, setTradeQuantity] = useState('');
    const [tradeSide, setTradeSide] = useState('BUY');
    const [tradeMsg, setTradeMsg] = useState({ type: '', text: '' });
    const [activeScenario, setActiveScenario] = useState(null);
    const [showCustomize, setShowCustomize] = useState(false);
    const [layout, setLayout] = useState(loadLayout);
    const [visible, setVisible] = useState(loadVisible);

    const { onDragStart, onResizeStart } = useDragResize(layout, setLayout);

    const toggleWidget = useCallback((id) => {
        setVisible(prev => {
            const next = { ...prev, [id]: prev[id] === false ? true : false };
            localStorage.setItem('cs_visible', JSON.stringify(next));
            return next;
        });
    }, []);

    const resetLayout = () => {
        setLayout(DEFAULT_LAYOUT);
        setVisible({});
        localStorage.removeItem('cs_layout');
        localStorage.removeItem('cs_visible');
    };

    // â”€â”€â”€ Data fetching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        const fetchAll = async () => {
            try { const r = await axios.get('http://localhost:5000/api/market/prices'); setMarketData(r.data.data); if (r.data.data.length > 0 && !activeChartCoin) loadChart(r.data.data[0]); } catch(e) {}
            try { const r = await axios.get('http://localhost:5000/api/sentiment/hype'); setSentimentData(r.data); } catch(e) {}
            try { const r = await axios.get('http://localhost:5000/api/market/fear-greed'); setFearGreed(r.data); } catch(e) {}
        };
        fetchAll();
        const iv = setInterval(fetchAll, 60000);
        return () => clearInterval(iv);
    }, []);

    const buildChart = useCallback((coin, prices, sentHistory) => {
        const priceLabels = prices.map(p => new Date(p[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        const sentDates = sentHistory.map(s => s.timestamp);
        const sentScores = sentHistory.map(s => s.score);
        const alignedSentiment = prices.map(p => {
            const t = p[0]; if (!sentDates.length) return null;
            let before = null, after = null;
            for (let i = 0; i < sentDates.length; i++) { if (sentDates[i] <= t) before = i; if (sentDates[i] >= t && after === null) after = i; }
            if (before === null) return sentScores[after] ?? null;
            if (after === null) return sentScores[before] ?? null;
            if (before === after) return sentScores[before];
            const ratio = (t - sentDates[before]) / (sentDates[after] - sentDates[before]);
            return sentScores[before] + ratio * (sentScores[after] - sentScores[before]);
        });
        const isPos = sentHistory.length === 0 ? true : sentScores[sentScores.length - 1] >= 50;
        setChartData({
            labels: priceLabels,
            datasets: [
                { label: `${coin.name} Price`, data: prices.map(p => p[1]), borderColor: isPos ? '#c0f241' : '#ef4444', backgroundColor: isPos ? 'rgba(192,242,65,0.08)' : 'rgba(239,68,68,0.08)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2, yAxisID: 'y' },
                ...(sentHistory.length > 0 ? [{ label: 'VADER Sentiment', data: alignedSentiment, borderColor: 'rgba(167,139,250,0.9)', backgroundColor: 'rgba(167,139,250,0.06)', fill: false, tension: 0.5, pointRadius: 3, pointBackgroundColor: '#a78bfa', borderWidth: 2, borderDash: [5, 3], yAxisID: 'y1' }] : [])
            ]
        });
    }, []);

    const loadChart = useCallback(async (coin) => {
        setActiveChartCoin(coin); setLoadingChart(true);
        try {
            const [priceRes, sentRes] = await Promise.allSettled([
                axios.get(`http://localhost:5000/api/market/chart/${coin.id}`),
                sentimentHistoryRef.current.length > 0 ? Promise.resolve({ data: { history: sentimentHistoryRef.current } }) : axios.get('http://localhost:5000/api/sentiment/history')
            ]);
            const prices = priceRes.status === 'fulfilled' ? priceRes.value.data.prices : [];
            const sentHistory = sentRes.status === 'fulfilled' ? (sentRes.value.data.history || []) : sentimentHistoryRef.current;
            if (sentHistory.length > 0) { sentimentHistoryRef.current = sentHistory; setSentimentHistory(sentHistory); }
            buildChart(coin, prices, sentHistory);
        } catch(e) {}
        setLoadingChart(false);
    }, [buildChart]);

    const executeTrade = async (e) => {
        e.preventDefault(); setTradeMsg({ type: '', text: '' });
        try {
            await authAxios.post('/trade/order', { symbol: tradeModalCoin.id, quantity: Number(tradeQuantity), side: tradeSide });
            setTradeMsg({ type: 'success', text: `${tradeSide} ${tradeQuantity} ${tradeModalCoin.symbol.toUpperCase()} confirmed!` });
            setTimeout(() => window.location.reload(), 1500);
        } catch(err) { setTradeMsg({ type: 'error', text: err.response?.data?.message || 'Trade failed.' }); }
    };
    const closeTradeModal = () => { setTradeModalCoin(null); setTradeQuantity(''); setTradeMsg({ type: '', text: '' }); setTradeSide('BUY'); };

    // â”€â”€â”€ Scenario / risk â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const getAssetTier = (coin) => {
        if (!coin) return 'alt';
        const id = coin.id || coin.symbol?.toLowerCase();
        if (id === 'bitcoin') return 'btc'; if (id === 'ethereum') return 'eth';
        if (['binancecoin','solana','ripple','cardano','avalanche-2','polkadot','chainlink'].includes(id)) return 'large';
        if (['tether','usd-coin','dai','busd','usdc'].includes(id)) return 'stable';
        return 'alt';
    };
    const riskScenarios = [
        { name: 'Normal Market',      icon: 'ðŸ“ˆ', color: '#c0f241', risk: 0, peak_drawdown: 0, recovery: null, detail: 'Live prices. No stress applied.', factors: { btc:1, eth:1, large:1, alt:1, stable:1 } },
        { name: 'COVID-19 Crash',     icon: 'ðŸ¦ ', color: '#f59e0b', risk: 2, peak_drawdown: 63, recovery: '~8 months', date: 'Mar 12, 2020', detail: 'Black Thursday â€” BTC -63%, altcoins -80%.', factors: { btc:.37, eth:.30, large:.28, alt:.22, stable:1 } },
        { name: 'Terra/LUNA Collapse',icon: 'ðŸŒ™', color: '#e84393', risk: 3, peak_drawdown: 99, recovery: '>2 years', date: 'May 9â€“12, 2022', detail: 'UST depegged, LUNA -99.9%, BTC -35%.', factors: { btc:.65, eth:.50, large:.42, alt:.25, stable:1 } },
        { name: 'FTX Bankruptcy',     icon: 'ðŸ’€', color: '#ef4444', risk: 3, peak_drawdown: 97, recovery: '~14 months', date: 'Nov 8â€“11, 2022', detail: 'FTX collapsed overnight. BTC -25%, ETH -30%.', factors: { btc:.75, eth:.70, large:.60, alt:.40, stable:1 } },
        { name: '2018 Crypto Winter', icon: 'ðŸ§Š', color: '#818cf8', risk: 4, peak_drawdown: 84, recovery: '~3 years', date: 'Janâ€“Dec 2018', detail: 'BTC -84%, ETH -95%, most alts never recovered.', factors: { btc:.16, eth:.05, large:.07, alt:.03, stable:1 } },
    ];
    const getSimulatedPrice = (coin, scen) => { if (!scen || scen.risk === 0) return coin.current_price; return coin.current_price * (scen.factors[getAssetTier(coin)] ?? 0.5); };
    const getSimulatedCoinValue = (item, scen) => {
        const liveCoin = marketData.find(c => c.id === String(item.symbol).toLowerCase());
        if (!liveCoin) return { value: 0, simPrice: 0, tier: 'alt', factor: 1 };
        const tier = getAssetTier(liveCoin); const factor = scen ? (scen.factors[tier] ?? 0.5) : 1.0;
        return { value: liveCoin.current_price * factor * item.quantity, simPrice: liveCoin.current_price * factor, tier, factor, liveCoin };
    };
    const computeRiskMetrics = (scen) => {
        if (!portfolio.length) return null;
        let totalCur = 0, totalSim = 0, worstDrop = 0, worstCoin = null;
        portfolio.forEach(item => {
            const { value, factor, liveCoin } = getSimulatedCoinValue(item, scen);
            const cur = (liveCoin?.current_price ?? 0) * item.quantity;
            totalCur += cur; totalSim += scen ? value : cur;
            const drop = scen ? (1 - factor) * 100 : 0;
            if (drop > worstDrop) { worstDrop = drop; worstCoin = item.symbol?.toUpperCase(); }
        });
        const totalLoss = totalCur - totalSim, drawdownPct = totalCur > 0 ? (totalLoss / totalCur) * 100 : 0;
        return { totalCur, totalSim, totalLoss, drawdownPct, worstCoin, worstDrop };
    };

    const filteredMarket = marketData.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.symbol.toLowerCase().includes(searchQuery.toLowerCase()));
    const originalValue = portfolio.reduce((s, item) => { const c = marketData.find(c => c.id === String(item.symbol).toLowerCase()); return s + (c ? c.current_price : 0) * item.quantity; }, 0);
    const totalInvested = portfolio.reduce((s, item) => s + item.averageBuyPrice * item.quantity, 0);
    const simMetrics = computeRiskMetrics(activeScenario);
    const displayValue = activeScenario ? (simMetrics?.totalSim ?? originalValue) : originalValue;
    const displayPnl = displayValue - totalInvested;

    const getFearGreedColor = v => { if (!v) return '#718096'; if (v>=75) return '#c0f241'; if (v>=55) return '#86efac'; if (v>=45) return '#fbbf24'; if (v>=25) return '#f97316'; return '#ef4444'; };
    const getSentimentColor = s => { if (!s && s !== 0) return '#a78bfa'; if (s>=0.05) return '#c0f241'; if (s<=-0.05) return '#ef4444'; return '#fbbf24'; };

    // â”€â”€â”€ Render individual widget content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const renderContent = (id) => {
        const card = { height: '100%', overflow: 'auto' };
        switch (id) {
            case 'cashBalance': return (
                <div style={{ ...card, display:'flex', flexDirection:'column', justifyContent:'center' }}>
                    <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#8bc34a', marginBottom:6 }}>Cash Balance</div>
                    <div style={{ fontSize:28, fontWeight:900, color:'#c0f241' }}>${user?.cashBalance?.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) ?? 'â€”'}</div>
                    <div style={{ fontSize:11, color:'rgba(0,0,0,0.5)', marginTop:6 }}>USD Â· Available to trade</div>
                </div>
            );
            case 'portfolioValue': return (
                <div style={{ ...card, display:'flex', flexDirection:'column', justifyContent:'center' }}>
                    <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#5bebf5', marginBottom:6 }}>Portfolio Value</div>
                    <div style={{ fontSize:28, fontWeight:900, color:'#fff' }}>${displayValue.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                    <div style={{ fontSize:12, color: displayPnl>=0?'#c0f241':'#ef4444', marginTop:6, fontWeight:600 }}>{displayPnl>=0?'â–²':'â–¼'} ${Math.abs(displayPnl).toFixed(2)} P&L {activeScenario?.risk>0 && <span style={{color:activeScenario.color}}>({activeScenario.name})</span>}</div>
                </div>
            );
            case 'vaderSentiment': return (
                <div style={{ ...card, display:'flex', flexDirection:'column', justifyContent:'center' }}>
                    <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#a78bfa', marginBottom:6 }}>VADER Sentiment</div>
                    <div style={{ fontSize:28, fontWeight:900, color: sentimentData ? getSentimentColor(sentimentData.vaderScore) : '#fff' }}>{sentimentData?.hypeScore ?? 'â€”'} <span style={{fontSize:14,color:'#4a5568'}}>/ 100</span></div>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:700, marginTop:8, display:'inline-block', backgroundColor: sentimentData ? getSentimentColor(sentimentData.vaderScore)+'22' : 'transparent', color: sentimentData ? getSentimentColor(sentimentData.vaderScore) : '#718096', border:`1px solid ${sentimentData?getSentimentColor(sentimentData.vaderScore)+'44':'#2d3748'}` }}>{sentimentData?.marketSentiment ?? 'Running NLPâ€¦'}</span>
                </div>
            );
            case 'fearGreed': return (
                <div style={{ ...card, display:'flex', flexDirection:'column', justifyContent:'center' }}>
                    <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#f97316', marginBottom:6 }}>Fear & Greed Index</div>
                    <div style={{ fontSize:28, fontWeight:900, color: getFearGreedColor(fearGreed?.value) }}>{fearGreed?.value ?? 'â€”'} <span style={{fontSize:14,color:'#4a5568'}}>/ 100</span></div>
                    <div style={{ fontSize:12, marginTop:8, color: fearGreed ? getFearGreedColor(fearGreed.value) : '#718096', fontWeight:600 }}>{fearGreed?.classification ?? 'Loadingâ€¦'}</div>
                </div>
            );
            case 'priceChart': return (
                <div style={card}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                        <span style={{ color:'#e2e8f0', fontSize:13, fontWeight:700 }}>{activeChartCoin?.name ?? 'Select asset below'}</span>
                        <div style={{ display:'flex', gap:12 }}>
                            <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#718096' }}><span style={{ width:16, height:2, backgroundColor:'#c0f241', display:'inline-block' }}/> Price</span>
                            <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#718096' }}><span style={{ width:8, height:8, borderRadius:'50%', backgroundColor:'#a78bfa', display:'inline-block' }}/> Sentiment</span>
                        </div>
                    </div>
                    <div style={{ height:'calc(100% - 30px)' }}>
                        {loadingChart ? <p style={{color:'#4a5568',fontSize:13}}>Loading chartâ€¦</p> : chartData ? (
                            <Line data={chartData} options={{ maintainAspectRatio:false, interaction:{mode:'index',intersect:false}, plugins:{legend:{display:false}, tooltip:{backgroundColor:'#111318',borderColor:'#2d3748',borderWidth:1,titleColor:'#a0aec0',bodyColor:'#fff',padding:10,callbacks:{label:(ctx)=>{ if(ctx.datasetIndex===0) return ` $${ctx.parsed.y.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; if(ctx.parsed.y!==null) return ` Sentiment: ${ctx.parsed.y.toFixed(1)}/100`; return null; }}}}, scales:{x:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#4a5568',font:{size:10},maxTicksLimit:8}},y:{position:'left',grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#718096',font:{size:10},callback:v=>v>=1000?`$${(v/1000).toFixed(0)}k`:`$${v.toFixed(0)}`}},y1:{position:'right',min:0,max:100,grid:{drawOnChartArea:false},ticks:{color:'#a78bfa',font:{size:10}}}} }} />
                        ) : <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',flexDirection:'column',gap:8}}><div style={{fontSize:28}}>ðŸ“ˆ</div><p style={{color:'#4a5568',fontSize:13,margin:0}}>Click an asset in the order book</p></div>}
                    </div>
                </div>
            );
            case 'holdings': return (
                <div style={card}>
                    <div style={{ fontSize:12, color:'#4a5568', marginBottom:10 }}>{activeScenario?.risk>0 ? activeScenario.detail : 'Live portfolio allocation.'}</div>
                    {portfolio.length > 0 ? portfolio.map(item => {
                        const { value: simVal, simPrice, tier, factor, liveCoin } = getSimulatedCoinValue(item, activeScenario);
                        const cost = item.averageBuyPrice * item.quantity;
                        const pnl = simVal - cost;
                        const dropPct = activeScenario?.risk>0 ? (1-factor)*100 : 0;
                        return (
                            <div key={item.symbol} style={{ marginBottom:14 }}>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                        {liveCoin?.image && <img src={liveCoin.image} alt={item.symbol} style={{ width:18,height:18,borderRadius:'50%' }} />}
                                        <div>
                                            <div style={{ color:'#fff', fontWeight:700, fontSize:12 }}>{item.symbol.toUpperCase()}</div>
                                            {dropPct>0 && <div style={{ fontSize:10, color:'#ef4444' }}>-{dropPct.toFixed(0)}% ({tier})</div>}
                                        </div>
                                    </div>
                                    <div style={{ textAlign:'right', fontSize:12, fontWeight:700, color:pnl>=0?'#c0f241':'#ef4444' }}>{pnl>=0?'+':'-'}${Math.abs(pnl).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                                </div>
                                <div style={{ backgroundColor:'#1a202c', borderRadius:4, height:5 }}><div style={{ width:`${Math.max(3,Math.min((activeScenario?.risk>0?factor:1)*100,100))}%`, height:'100%', borderRadius:4, backgroundColor: factor<0.5?'#ef4444':factor<0.75?'#f97316':'#c0f241' }}/></div>
                                <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:10, color:'#4a5568' }}>
                                    <span>Cost: ${cost.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                                    <span>Sim: ${simVal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                                </div>
                            </div>
                        );
                    }) : <p style={{color:'#4a5568',fontSize:13}}>No holdings. Buy assets to track here.</p>}
                </div>
            );
            case 'orderBook': return (
                <div style={card}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                        <span style={{ color:'#a0aec0', fontSize:12, fontWeight:600 }}>Market Order Book</span>
                        <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="ðŸ” Filterâ€¦" style={{ padding:'6px 10px', fontSize:12, borderRadius:8, border:'1px solid #2d3748', backgroundColor:'#0b0d10', color:'#fff', outline:'none', width:140 }} />
                    </div>
                    <div style={{ overflowX:'auto', maxHeight:'calc(100% - 40px)' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse' }}>
                            <thead><tr style={{ borderBottom:'1px solid #2d3748', color:'#4a5568', fontSize:10, textTransform:'uppercase', letterSpacing:'0.5px' }}>
                                <th style={{padding:'8px 0',textAlign:'left'}}>Asset</th>
                                <th style={{padding:'8px 0',textAlign:'left'}}>Price</th>
                                <th style={{padding:'8px 0',textAlign:'left'}}>24h</th>
                                <th style={{padding:'8px 0',textAlign:'left'}}>Signal</th>
                                <th style={{padding:'8px 0',textAlign:'right'}}>Action</th>
                            </tr></thead>
                            <tbody>{filteredMarket.map((coin,i) => {
                                const sp = getSimulatedPrice(coin, activeScenario);
                                const isSim = activeScenario?.risk>0;
                                const isPos = coin.price_change_percentage_24h >= 0;
                                return (
                                    <tr key={coin.id} style={{ borderBottom:'1px solid #111318', cursor:'pointer' }} onClick={()=>loadChart(coin)} onMouseEnter={e=>e.currentTarget.style.backgroundColor='#ffffff06'} onMouseLeave={e=>e.currentTarget.style.backgroundColor='transparent'}>
                                        <td style={{padding:'10px 0'}}><div style={{display:'flex',alignItems:'center',gap:8}}><img src={coin.image} alt={coin.name} style={{width:22,height:22,borderRadius:'50%'}}/><div><div style={{color:'#fff',fontWeight:600,fontSize:13}}>{coin.name}</div><div style={{color:'#4a5568',fontSize:10,textTransform:'uppercase'}}>{coin.symbol}</div></div></div></td>
                                        <td style={{padding:'10px 0',color:isSim?'#ef4444':'#e2e8f0',fontWeight:600,fontSize:13}}>${sp.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:sp<1?6:2})}</td>
                                        <td style={{padding:'10px 0',color:isPos?'#c0f241':'#ef4444',fontSize:12,fontWeight:600}}>{isPos?'â–²':'â–¼'} {Math.abs(coin.price_change_percentage_24h)?.toFixed(2)}%</td>
                                        <td style={{padding:'10px 0'}} onClick={e=>e.stopPropagation()}><CoinSentimentBadge coin={coin} index={i}/></td>
                                        <td style={{padding:'10px 0',textAlign:'right'}}><button onClick={e=>{e.stopPropagation();setTradeModalCoin(coin);}} disabled={isSim} style={{padding:'5px 14px',borderRadius:8,border:'none',cursor:isSim?'default':'pointer',fontWeight:700,fontSize:12,backgroundColor:isSim?'#1a202c':'#c0f241',color:isSim?'#4a5568':'#111'}}>{isSim?'ðŸ”’':'TRADE'}</button></td>
                                    </tr>
                                );
                            })}</tbody>
                        </table>
                    </div>
                </div>
            );
            case 'doomsday': return (
                <div style={card}>
                    <p style={{ color:'#4a5568', fontSize:11, marginBottom:12, lineHeight:1.5 }}>Per-asset crash simulation using real historical drawdown data.</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:16 }}>
                        {riskScenarios.map(scen => {
                            const isActive = activeScenario?.name === scen.name;
                            return (
                                <button key={scen.name} onClick={()=>setActiveScenario(isActive&&scen.risk>0?riskScenarios[0]:scen)} style={{ padding:'9px 12px', borderRadius:10, border:'1px solid', cursor:'pointer', fontWeight:600, fontSize:12, textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center', backgroundColor:isActive?`${scen.color}12`:'#0b0d10', color:isActive?scen.color:'#718096', borderColor:isActive?scen.color:'#1f2937' }}>
                                    <span>{scen.icon} {scen.name}</span>
                                    {scen.risk>0 && <span style={{fontSize:10,opacity:.7}}>-{scen.peak_drawdown}% peak</span>}
                                </button>
                            );
                        })}
                    </div>
                    {activeScenario?.risk>0 && simMetrics && (
                        <div style={{ backgroundColor:'#0b0d10', borderRadius:10, padding:12, border:`1px solid ${activeScenario.color}33` }}>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                                <div style={{padding:8,backgroundColor:'#111318',borderRadius:7}}><div style={{color:'#4a5568',fontSize:9,marginBottom:3,textTransform:'uppercase'}}>Sim Loss</div><div style={{color:'#ef4444',fontWeight:800,fontSize:15}}>-${simMetrics.totalLoss.toLocaleString(undefined,{maximumFractionDigits:0})}</div></div>
                                <div style={{padding:8,backgroundColor:'#111318',borderRadius:7}}><div style={{color:'#4a5568',fontSize:9,marginBottom:3,textTransform:'uppercase'}}>Drawdown</div><div style={{color:'#f97316',fontWeight:800,fontSize:15}}>-{simMetrics.drawdownPct.toFixed(1)}%</div></div>
                                <div style={{padding:8,backgroundColor:'#111318',borderRadius:7}}><div style={{color:'#4a5568',fontSize:9,marginBottom:3,textTransform:'uppercase'}}>Worst Asset</div><div style={{color:'#ef4444',fontWeight:700,fontSize:13}}>{simMetrics.worstCoin??'â€”'} (-{simMetrics.worstDrop.toFixed(0)}%)</div></div>
                                <div style={{padding:8,backgroundColor:'#111318',borderRadius:7}}><div style={{color:'#4a5568',fontSize:9,marginBottom:3,textTransform:'uppercase'}}>Recovery</div><div style={{color:'#a78bfa',fontWeight:700,fontSize:13}}>{activeScenario.recovery??'?'}</div></div>
                            </div>
                            <div><div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><span style={{color:'#4a5568',fontSize:10}}>Risk Level</span><span style={{color:activeScenario.color,fontSize:10,fontWeight:700}}>{['','LOW','MODERATE','HIGH','EXTREME'][activeScenario.risk]}</span></div><div style={{backgroundColor:'#1a202c',borderRadius:4,height:5}}><div style={{width:`${activeScenario.risk*25}%`,height:'100%',borderRadius:4,backgroundColor:activeScenario.color}}/></div></div>
                        </div>
                    )}
                </div>
            );
            case 'allocation': return <AllocationWidget portfolio={portfolio} marketData={marketData} />;
            case 'dominance':  return <DominanceWidget marketData={marketData} />;
            case 'volumeBar':  return <VolumeBarWidget marketData={marketData} />;
            case 'heatmap':    return <HeatmapWidget marketData={marketData} />;
            case 'pnlGauge':   return <PnlGaugeWidget portfolio={portfolio} marketData={marketData} totalInvested={totalInvested} />;
            case 'sentRadar':  return <SentimentRadarWidget sentimentData={sentimentData} fearGreed={fearGreed} marketData={marketData} />;
            default: return null;
        }
    };

    const activeWidgets = WIDGETS.filter(w => visible[w.id] !== false);
    const activeLayout = layout.filter(l => visible[l.id] !== false);
    const totalH = activeLayout.reduce((max, l) => Math.max(max, l.y + l.h), 0);

    return (
        <div>
            {/* Customize button */}
            <div style={{ display:'flex', justifyContent:'flex-end', padding:'0 0 12px 0', gap:10 }}>
                <button onClick={resetLayout} style={{ padding:'7px 16px', borderRadius:8, border:'1px solid #2d3748', backgroundColor:'#0b0d10', color:'#4a5568', cursor:'pointer', fontSize:12, fontWeight:600 }}>â†º Reset Layout</button>
                <button onClick={()=>setShowCustomize(v=>!v)} style={{ padding:'7px 16px', borderRadius:8, border:'1px solid #a78bfa55', backgroundColor: showCustomize?'rgba(167,139,250,0.1)':'#0b0d10', color:'#a78bfa', cursor:'pointer', fontSize:12, fontWeight:700 }}>âœï¸ Customize Widgets</button>
            </div>

            {/* Customize panel */}
            {showCustomize && (
                <div style={{ marginBottom:16, padding:16, backgroundColor:'#0f1117', border:'1px solid #1f2937', borderRadius:14 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#a0aec0', marginBottom:12 }}>Toggle Widgets</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                        {WIDGETS.map(w => {
                            const on = visible[w.id] !== false;
                            return (
                                <button key={w.id} onClick={()=>toggleWidget(w.id)} style={{ padding:'6px 14px', borderRadius:20, border:'1px solid', cursor:'pointer', fontSize:12, fontWeight:600, backgroundColor: on?'rgba(192,242,65,0.1)':'#0b0d10', color: on?'#c0f241':'#4a5568', borderColor: on?'#c0f241':'#2d3748' }}>
                                    {on ? 'âœ“ ' : 'â—‹ '}{w.title}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Widget grid */}
            <div style={{ position:'relative', width:'100%', minHeight: totalH + 20 }}>
                {activeWidgets.map(w => {
                    const item = activeLayout.find(l => l.id === w.id) || DEFAULT_LAYOUT.find(l => l.id === w.id);
                    if (!item) return null;
                    return (
                        <WidgetCard key={w.id} id={w.id} title={w.title} item={item} onDragStart={onDragStart} onResizeStart={onResizeStart} onClose={toggleWidget}>
                            {renderContent(w.id)}
                        </WidgetCard>
                    );
                })}
            </div>

            {/* Trade Modal */}
            {tradeModalCoin && (
                <div style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
                    <div style={{ backgroundColor:'#0f1117', border:'1px solid #1f2937', borderRadius:16, padding:24, width:360 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                <img src={tradeModalCoin.image} alt={tradeModalCoin.name} style={{width:28,height:28,borderRadius:'50%'}} />
                                <span style={{ color:'#fff', fontWeight:700, fontSize:16 }}>{tradeModalCoin.name}</span>
                            </div>
                            <button onClick={closeTradeModal} style={{background:'none',border:'none',color:'#4a5568',cursor:'pointer',fontSize:20}}>âœ•</button>
                        </div>
                        <div style={{ color:'#4a5568', fontSize:12, marginBottom:16 }}>Current Price: <strong style={{color:'#e2e8f0'}}>${tradeModalCoin.current_price?.toLocaleString()}</strong></div>
                        <form onSubmit={executeTrade}>
                            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                                {['BUY','SELL'].map(side => (
                                    <button key={side} type="button" onClick={()=>setTradeSide(side)} style={{ flex:1, padding:'9px', borderRadius:8, border:'1px solid', cursor:'pointer', fontWeight:700, fontSize:13, backgroundColor: tradeSide===side?(side==='BUY'?'rgba(192,242,65,0.15)':'rgba(239,68,68,0.15)'):'transparent', color: tradeSide===side?(side==='BUY'?'#c0f241':'#ef4444'):'#4a5568', borderColor: tradeSide===side?(side==='BUY'?'#c0f241':'#ef4444'):'#2d3748' }}>
                                        {side === 'BUY' ? 'â–² BUY' : 'â–¼ SELL'}
                                    </button>
                                ))}
                            </div>
                            <input type="number" step="0.000001" min="0.000001" placeholder="Quantity (e.g. 0.5)" value={tradeQuantity} onChange={e=>setTradeQuantity(e.target.value)} required style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #2d3748', backgroundColor:'#0b0d10', color:'#fff', fontSize:13, boxSizing:'border-box', outline:'none', marginBottom:12 }} />
                            {tradeMsg.text && <div style={{padding:'8px 12px',borderRadius:8,marginBottom:12,backgroundColor:tradeMsg.type==='success'?'rgba(192,242,65,0.1)':'rgba(239,68,68,0.1)',color:tradeMsg.type==='success'?'#c0f241':'#ef4444',fontSize:12}}>{tradeMsg.text}</div>}
                            <div style={{ display:'flex', gap:8 }}>
                                <button type="submit" style={{ flex:1, padding:'11px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:700, fontSize:13, backgroundColor: tradeSide==='BUY'?'#c0f241':'#ef4444', color:'#111' }}>Confirm {tradeSide}</button>
                                <button type="button" onClick={closeTradeModal} style={{ flex:1, padding:'11px', borderRadius:8, border:'1px solid #2d3748', cursor:'pointer', fontWeight:600, fontSize:13, backgroundColor:'#1a202c', color:'#a0aec0' }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- VIEW 2: REAL TRENDING ASSETS ---
const TrendingLeaderboard = () => {
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetching REAL 100% Live data from CoinGecko Trending API
        axios.get('https://api.coingecko.com/api/v3/search/trending')
            .then(res => {
                setTrending(res.data.coins);
                setLoading(false);
            })
            .catch(err => {
                console.error("Trending fetch error", err);
                setLoading(false);
            });
    }, []);

    return (
        <div style={styles.glassCard}>
            <h2 style={{ color: '#fff', marginTop: 0 }}>🔥 Live Trending Assets</h2>
            <p style={{ color: '#718096', marginBottom: '20px' }}>Real-time data stream of the top 7 most searched cryptocurrencies globally.</p>
            
            {loading ? (
                <p style={{color: '#c0f241'}}>Connecting to market stream...</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #2d3748', color: '#718096', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase' }}>
                            <th style={{ padding: '12px 0' }}>Rank</th>
                            <th style={{ padding: '12px 0' }}>Asset</th>
                            <th style={{ padding: '12px 0' }}>Price (USD)</th>
                            <th style={{ padding: '12px 0', textAlign: 'right' }}>7D Trend</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trending.map(coin => (
                            <tr key={coin.item.id} style={{ borderBottom: '1px solid #1a202c' }}>
                                <td style={{ padding: '15px 0', color: '#a0aec0', fontWeight: 'bold' }}>#{coin.item.market_cap_rank || '-'}</td>
                                <td style={{ padding: '15px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontWeight: 'bold' }}>
                                    <img src={coin.item.thumb} alt={coin.item.name} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                                    {coin.item.name} <span style={{ color: '#718096', fontSize: '12px' }}>{coin.item.symbol}</span>
                                </td>
                                <td style={{ padding: '15px 0', color: '#c0f241', fontWeight: 'bold' }}>
                                    ${coin.item.data?.price ? coin.item.data.price.toFixed(4) : 'N/A'}
                                </td>
                                <td style={{ padding: '15px 0', textAlign: 'right' }}>
                                    {coin.item.data?.sparkline ? (
                                        <img src={coin.item.data.sparkline} alt="trend" style={{ height: '30px', filter: 'hue-rotate(85deg) saturate(200%)' }} />
                                    ) : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

// --- VIEW 3: TRANSACTION HISTORY & WALLET ---
const BankWallet = () => {
    const { authAxios } = useContext(AuthContext);
    const [txns, setTxns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authAxios.get('/trade/history')
            .then(res => { setTxns(res.data.transactions); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div style={styles.gridMid}>
            <div style={{...styles.glassCard, flex: '1 1 400px'}}>
                <h2 style={{ color: '#fff', marginTop: 0, marginBottom: '6px' }}>ðŸ¦ Portfolio Account</h2>
                <p style={{ color: '#718096', marginBottom: '24px', fontSize: '14px' }}>This is a simulated trading account with virtual USD. No real money is involved.</p>

                <div style={{ padding: '20px', border: '1px dashed #2d3748', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>💳</div>
                    <h3 style={{ color: '#fff', margin: '0 0 8px 0', fontWeight: '600' }}>External Bank Integration</h3>
                    <p style={{ color: '#718096', fontSize: '13px', margin: '0 0 16px 0', lineHeight: '1.6' }}>
                        Real bank connections via Plaid are planned for a future release.
                        For now, your account starts with $10,000 in virtual USD.
                    </p>
                    <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', backgroundColor: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', fontWeight: '600' }}>COMING SOON</span>
                </div>
            </div>

            <div style={{...styles.glassCard, flex: '1 1 400px'}}>
                <h3 style={{...styles.cardLabel, marginBottom: '16px' }}>Trade History</h3>
                {loading ? (
                    <p style={{ color: '#c0f241', fontSize: '14px' }}>Fetching records...</p>
                ) : txns.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
                        <p style={{ color: '#718096', fontSize: '14px' }}>No trades yet. Head to the dashboard to make your first trade!</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', maxHeight: '380px', overflowY: 'auto' }}>
                        {txns.map((t, i) => {
                            const isBuy = t.type === 'BUY';
                            const date = new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            return (
                                <div key={t._id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #1a202c' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                                            backgroundColor: isBuy ? 'rgba(192,242,65,0.1)' : 'rgba(239,68,68,0.1)' }}>
                                            {isBuy ? '▲' : '▼'}
                                        </div>
                                        <div>
                                            <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>{t.type} {t.symbol?.toUpperCase()}</div>
                                            <div style={{ color: '#718096', fontSize: '12px' }}>{date} &middot; {t.quantity} units @ ${t.pricePerUnit?.toFixed(2)}</div>
                                        </div>
                                    </div>
                                    <div style={{ color: isBuy ? '#ef4444' : '#c0f241', fontWeight: '700', fontSize: '14px', textAlign: 'right' }}>
                                        {isBuy ? '-' : '+'}${t.totalAmount?.toFixed(2)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- VIEW 4: SETTINGS ---
const Settings = () => {
    const { user } = useContext(AuthContext);
    const [prefs, setPrefs] = useState(() => {
        try { return JSON.parse(localStorage.getItem('fluxPrefs') || '{}'); } catch { return {}; }
    });

    const togglePref = (key) => {
        const updated = { ...prefs, [key]: !prefs[key] };
        setPrefs(updated);
        localStorage.setItem('fluxPrefs', JSON.stringify(updated));
    };

    const Toggle = ({ label, desc, prefKey }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #1a202c' }}>
            <div>
                <div style={{ color: '#e2e8f0', fontWeight: '500', fontSize: '14px' }}>{label}</div>
                <div style={{ color: '#4a5568', fontSize: '12px', marginTop: '2px' }}>{desc}</div>
            </div>
            <div onClick={() => togglePref(prefKey)}
                style={{ width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', transition: '0.2s', position: 'relative',
                    backgroundColor: prefs[prefKey] ? '#c0f241' : '#2d3748' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', top: '3px', transition: '0.2s',
                    left: prefs[prefKey] ? '23px' : '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '720px' }}>
            <div style={styles.glassCard}>
                <h2 style={{ color: '#fff', marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>👤 Account Profile</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label style={{ color: '#718096', fontSize: '12px', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</label>
                        <input type="text" value={user?.name || ''} readOnly style={{...styles.input, cursor: 'not-allowed', opacity: 0.7}} />
                    </div>
                    <div>
                        <label style={{ color: '#718096', fontSize: '12px', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</label>
                        <input type="text" value={user?.email || ''} readOnly style={{...styles.input, cursor: 'not-allowed', opacity: 0.7}} />
                    </div>
                </div>
            </div>

            <div style={styles.glassCard}>
                <h2 style={{ color: '#fff', marginTop: 0, marginBottom: '4px', fontSize: '18px' }}>âš™ï¸ Preferences</h2>
                <p style={{ color: '#4a5568', fontSize: '13px', marginBottom: '4px' }}>Stored locally in your browser.</p>
                <Toggle label="Compact Order Book" desc="Show more rows with less padding" prefKey="compactTable" />
                <Toggle label="Sound Effects" desc="Audio cues on successful trades" prefKey="sounds" />
                <Toggle label="Show PnL in Green/Red" desc="Color-code portfolio performance" prefKey="colorPnl" />
            </div>

            <div style={{...styles.glassCard, borderLeft: '3px solid #a78bfa'}}>
                <h2 style={{ color: '#fff', marginTop: 0, marginBottom: '8px', fontSize: '18px' }}>🧠 AI Sentiment Engine</h2>
                <p style={{ color: '#a0aec0', fontSize: '14px', lineHeight: '1.7' }}>
                    FluxCapital uses a <strong style={{color:'#c0f241'}}>VADER-style NLP model</strong> with a 100+ term crypto lexicon, negation handling, and intensifier weighting. News is sourced from the <strong style={{color:'#c0f241'}}>CryptoCompare News API</strong> (free, no API key required).
                </p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                    {[['VADER NLP', '#a78bfa'], ['CryptoCompare News', '#5bebf5'], ['Alternative.me F&G', '#f97316'], ['CoinGecko Market', '#c0f241']].map(([label, color]) => (
                        <span key={label} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', fontWeight: '600',
                            backgroundColor: color + '15', color, border: `1px solid ${color}33` }}>{label}</span>
                    ))}
                </div>
            </div>
        </div>
    );
};


// --- MAIN LAYOUT SHELL ---
const Layout = () => {
    const { user, logout, loading } = useContext(AuthContext);
    const location = useLocation();

    if (loading) return <div style={styles.loading}>Connecting to Flux Servers...</div>;

    // If not logged in, render Auth pages full screen
    if (!user) {
        return (
            <Routes>
                <Route path="/login" element={<AuthPage isLogin={true} />} />
                <Route path="/register" element={<AuthPage isLogin={false} />} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        );
    }

    // Authenticated layout with Sidebar
    const navLinks = [
        { to: '/', icon: 'ðŸ“ˆ', label: 'Dashboard' },
        { to: '/trending', icon: 'ðŸ”¥', label: 'Trending' },
        { to: '/bank', icon: 'ðŸ’°', label: 'Trade History' },
        { to: '/settings', icon: 'âš™ï¸', label: 'Settings' },
    ];

    return (
        <div style={styles.appContainer}>
            <div style={styles.sidebar}>
                <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid #1a202c' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #c0f241, #7ecb0f)', borderRadius: '6px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px' }}>⚡</div>
                        <h2 style={{ color: '#fff', margin: 0, fontSize: '18px', fontWeight: '800', letterSpacing: '-0.3px' }}>Flux<span style={{fontWeight: '300', color: '#718096'}}>Capital</span></h2>
                    </div>
                    <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#c0f241', boxShadow: '0 0 6px #c0f241' }} />
                        <span style={{ color: '#718096', fontSize: '12px' }}>Markets Live</span>
                    </div>
                </div>

                <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    {navLinks.map(({ to, icon, label }) => {
                        const isActive = location.pathname === to;
                        return (
                            <Link key={to} to={to} style={isActive ? styles.navItemActive : styles.navItem}>
                                <span style={{ fontSize: '16px', minWidth: '20px' }}>{icon}</span>
                                <span>{label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div style={{ padding: '16px 12px', borderTop: '1px solid #1a202c' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '10px', backgroundColor: '#0b0d10', marginBottom: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#c0f241', color: '#111', fontWeight: '800', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px' }}>
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                            <div style={{ color: '#fff', fontSize: '13px', fontWeight: '600' }}>{user?.name}</div>
                            <div style={{ color: '#4a5568', fontSize: '11px' }}>{user?.email}</div>
                        </div>
                    </div>
                    <button onClick={logout} style={styles.superBtn}>â Logout</button>
                </div>
            </div>
            
            <div style={styles.mainContent}>
                <div style={styles.dashboardWrapper}>
                    <div style={styles.header}>
                        <div>
                            <h2 style={{ margin: 0, fontWeight: '700', color: '#fff', fontSize: '20px', letterSpacing: '-0.3px' }}>
                                {location.pathname === '/' ? 'Trading Dashboard'
                                : location.pathname === '/trending' ? 'ðŸ”¥ Trending Assets'
                                : location.pathname === '/bank' ? 'ðŸ’° Trade History'
                                : 'âš™ï¸ Settings'}
                            </h2>
                            <p style={{ margin: '4px 0 0 0', color: '#4a5568', fontSize: '13px' }}>FluxCapital Simulator · Virtual Trading Platform</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={styles.profileCircle}>{user?.name?.charAt(0)?.toUpperCase()}</div>
                        </div>
                    </div>

                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/trending" element={<TrendingLeaderboard />} />
                        <Route path="/bank" element={<BankWallet />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
};

export default function App() {
    return (
        <Router>
            <Layout />
        </Router>
    );
}

// --- PREMIUM FLUX THEME STYLES ---
const styles = {
    appContainer: { display: 'flex', height: '100vh', backgroundColor: '#0b0d10', color: '#fff', fontFamily: "'Inter', -apple-system, sans-serif" },

    // Sidebar
    sidebar: { width: '240px', backgroundColor: '#111318', borderRight: '1px solid #1a202c', display: 'flex', flexDirection: 'column', flexShrink: 0 },
    navItemActive: { padding: '10px 12px', backgroundColor: 'rgba(192,242,65,0.08)', color: '#c0f241', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '2px solid #c0f241' },
    navItem: { padding: '10px 12px', color: '#718096', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', transition: '0.15s', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '2px solid transparent' },
    superBtn: { width: '100%', padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', color: '#ef4444', fontWeight: '600', cursor: 'pointer', textAlign: 'left', fontSize: '13px' },

    // Main Content
    mainContent: { flex: 1, overflowY: 'auto', padding: '0' },
    dashboardWrapper: { padding: '28px 32px', maxWidth: '1400px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', paddingBottom: '20px', borderBottom: '1px solid #1a202c' },
    profileCircle: { width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #c0f241, #7ecb0f)', color: '#111', fontWeight: '800', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '15px' },

    // Grid Layouts
    gridTop: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' },
    gridMid: { display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' },
    gridBottom: { display: 'flex', gap: '20px', flexWrap: 'wrap' },

    // Cards
    statCard: { borderRadius: '16px', padding: '22px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
    glassCard: { backgroundColor: '#111318', borderRadius: '16px', padding: '24px', border: '1px solid #1a202c' },
    cardLabel: { margin: '0 0 5px 0', color: '#fff', fontSize: '16px', fontWeight: '700' },

    // Auth
    authContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0b0d10', position: 'relative', overflow: 'hidden' },
    authBg: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 50%, rgba(192,242,65,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(157,91,245,0.08) 0%, transparent 60%)', pointerEvents: 'none' },
    authCard: { backgroundColor: '#111318', padding: '44px', borderRadius: '24px', border: '1px solid #1f2937', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', position: 'relative', zIndex: 1 },
    form: { display: 'flex', flexDirection: 'column', gap: '14px' },
    input: { padding: '14px 16px', fontSize: '14px', borderRadius: '10px', border: '1px solid #2d3748', backgroundColor: '#0b0d10', color: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box', transition: '0.15s' },
    actionBtn: { padding: '14px 20px', fontSize: '14px', background: 'linear-gradient(135deg, #c0f241, #a8d836)', color: '#111', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', transition: '0.15s', letterSpacing: '0.3px' },
    link: { color: '#c0f241', textDecoration: 'none', fontWeight: '600' },
    error: { backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center', fontSize: '13px' },
    loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '16px', color: '#c0f241', backgroundColor: '#0b0d10', gap: '10px' },

    // Progress Bar
    progressBarBg: { height: '5px', backgroundColor: '#1f2937', borderRadius: '3px', overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: '3px', transition: 'width 1s ease' },

    // Buttons
    tradeBtn: { padding: '7px 14px', backgroundColor: 'rgba(192,242,65,0.08)', color: '#c0f241', border: '1px solid rgba(192,242,65,0.4)', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', transition: '0.15s' },
    disabledBtn: { padding: '7px 14px', backgroundColor: 'transparent', color: '#2d3748', border: '1px solid #1f2937', borderRadius: '6px', cursor: 'not-allowed', fontWeight: '700', fontSize: '12px' },
    scenarioBtn: { padding: '14px', border: '1px solid', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', transition: '0.2s', textAlign: 'left' },

    // Modal
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,13,16,0.88)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalCard: { backgroundColor: '#181b21', padding: '32px', borderRadius: '20px', border: '1px solid #2d3748', width: '90%', maxWidth: '400px', boxShadow: '0 30px 60px rgba(0,0,0,0.6)' },
    modalInput: { padding: '14px 16px', fontSize: '14px', borderRadius: '10px', border: '1px solid #2d3748', backgroundColor: '#0b0d10', color: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box', marginBottom: '12px' }
};
