import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Line, Doughnut, Bar, Radar } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
    ArcElement, BarElement, RadialLinearScale, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { AuthContext } from './context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement,
    ArcElement, BarElement, RadialLinearScale, Title, Tooltip, Legend, Filler);

// ─── Coin sentiment badge cache ───────────────────────────────────────────────
const coinSentCache = {};
const CoinSentimentBadge = ({ coin, index }) => {
    const symbol = coin.symbol?.toUpperCase();
    const [sent, setSent] = useState(coinSentCache[symbol] || null);
    const [loading, setLoading] = useState(!coinSentCache[symbol]);
    useEffect(() => {
        if (coinSentCache[symbol]) { setSent(coinSentCache[symbol]); setLoading(false); return; }
        const t = setTimeout(async () => {
            try { const r = await axios.get(`http://localhost:5000/api/sentiment/coin/${symbol}`); coinSentCache[symbol] = r.data; setSent(r.data); }
            catch { setSent({ hypeScore: 50, signal: 'NEUTRAL' }); }
            setLoading(false);
        }, index * 500);
        return () => clearTimeout(t);
    }, [symbol, index]);
    if (loading) return <span style={{ fontSize: '10px', color: '#4a5568', padding: '3px 10px', borderRadius: '12px', border: '1px solid #1f2937' }}>…</span>;
    const sig = sent?.signal || 'NEUTRAL';
    const clr = sig === 'BUY' ? '#c0f241' : sig === 'SELL' ? '#ef4444' : '#fbbf24';
    return (
        <span title={`VADER: ${sent?.hypeScore}/100`} style={{ fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '12px', border: `1px solid ${clr}55`, color: clr, backgroundColor: `${clr}11`, display: 'inline-block', minWidth: '64px', textAlign: 'center' }}>
            {sig === 'BUY' ? '▲' : sig === 'SELL' ? '▼' : '●'} {sig}
        </span>
    );
};

// ─── Widget config ────────────────────────────────────────────────────────────
const WIDGETS = [
    { id: 'cashBalance',    title: '💰 Cash Balance' },
    { id: 'portfolioValue', title: '📈 Portfolio Value' },
    { id: 'vaderSentiment', title: '🤖 VADER Sentiment' },
    { id: 'fearGreed',      title: '😱 Fear & Greed' },
    { id: 'priceChart',     title: '📊 Price vs Sentiment' },
    { id: 'holdings',       title: '🏦 Firm Breakdown' },
    { id: 'orderBook',      title: '📋 Market Order Book' },
    { id: 'doomsday',       title: '☢️ Doomsday Protocol' },
    { id: 'allocation',     title: '🍩 Portfolio Allocation' },
    { id: 'dominance',      title: '🌐 Market Dominance' },
    { id: 'volumeBar',      title: '📊 Volume Leaders' },
    { id: 'heatmap',        title: '🟩 24h Heatmap' },
    { id: 'pnlGauge',       title: '⭕ P&L Gauge' },
    { id: 'sentRadar',      title: '🕸️ Sentiment Radar' },
];

// Default pixel layout: { id, x, y, w, h } — w/h in px
const DEFAULT_LAYOUT = [
    { id: 'cashBalance',    x: 0,   y: 0,   w: 280, h: 110 },
    { id: 'portfolioValue', x: 290, y: 0,   w: 280, h: 110 },
    { id: 'vaderSentiment', x: 580, y: 0,   w: 280, h: 110 },
    { id: 'fearGreed',      x: 870, y: 0,   w: 280, h: 110 },
    { id: 'priceChart',     x: 0,   y: 120, w: 700, h: 380 },
    { id: 'holdings',       x: 710, y: 120, w: 440, h: 380 },
    { id: 'orderBook',      x: 0,   y: 510, w: 700, h: 340 },
    { id: 'doomsday',       x: 710, y: 510, w: 440, h: 400 },
    { id: 'allocation',     x: 0,   y: 860, w: 370, h: 300 },
    { id: 'dominance',      x: 380, y: 860, w: 370, h: 300 },
    { id: 'volumeBar',      x: 760, y: 860, w: 390, h: 300 },
    { id: 'heatmap',        x: 0,   y: 1170,w: 570, h: 260 },
    { id: 'pnlGauge',       x: 580, y: 1170,w: 270, h: 260 },
    { id: 'sentRadar',      x: 860, y: 1170,w: 290, h: 300 },
];

const loadLayout = () => {
    try { const s = localStorage.getItem('cs_layout'); return s ? JSON.parse(s) : DEFAULT_LAYOUT; }
    catch { return DEFAULT_LAYOUT; }
};
const loadVisible = () => {
    try { const s = localStorage.getItem('cs_visible'); return s ? JSON.parse(s) : {}; }
    catch { return {}; }
};

// ─── Drag+Resize engine ───────────────────────────────────────────────────────
const useDragResize = (layout, setLayout) => {
    const dragging = useRef(null);
    const resizing = useRef(null);

    const onDragStart = useCallback((e, id) => {
        e.preventDefault();
        const item = layout.find(l => l.id === id);
        dragging.current = { id, startX: e.clientX - item.x, startY: e.clientY - item.y };
    }, [layout]);

    const onResizeStart = useCallback((e, id) => {
        e.preventDefault(); e.stopPropagation();
        const item = layout.find(l => l.id === id);
        resizing.current = { id, startX: e.clientX, startY: e.clientY, startW: item.w, startH: item.h };
    }, [layout]);

    useEffect(() => {
        const onMove = (e) => {
            if (dragging.current) {
                const { id, startX, startY } = dragging.current;
                const x = Math.max(0, e.clientX - startX);
                const y = Math.max(0, e.clientY - startY);
                setLayout(prev => {
                    const next = prev.map(l => l.id === id ? { ...l, x, y } : l);
                    localStorage.setItem('cs_layout', JSON.stringify(next));
                    return next;
                });
            }
            if (resizing.current) {
                const { id, startX, startY, startW, startH } = resizing.current;
                const w = Math.max(220, startW + (e.clientX - startX));
                const h = Math.max(100, startH + (e.clientY - startY));
                setLayout(prev => {
                    const next = prev.map(l => l.id === id ? { ...l, w, h } : l);
                    localStorage.setItem('cs_layout', JSON.stringify(next));
                    return next;
                });
            }
        };
        const onUp = () => { dragging.current = null; resizing.current = null; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [setLayout]);

    return { onDragStart, onResizeStart };
};

// ─── Widget card wrapper ──────────────────────────────────────────────────────
const WidgetCard = ({ id, title, item, onDragStart, onResizeStart, onClose, children }) => (
    <div style={{
        position: 'absolute', left: item.x, top: item.y, width: item.w, height: item.h,
        backgroundColor: '#0f1117', border: '1px solid #1f2937', borderRadius: '16px',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)'
    }}>
        {/* Drag handle */}
        <div
            onMouseDown={e => onDragStart(e, id)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #1f2937', cursor: 'grab', userSelect: 'none', flexShrink: 0, background: '#111318' }}
        >
            <span style={{ color: '#a0aec0', fontWeight: '700', fontSize: '12px', letterSpacing: '0.5px' }}>{title}</span>
            <button onMouseDown={e => e.stopPropagation()} onClick={() => onClose(id)}
                style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px' }}>✕</button>
        </div>
        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '14px' }}>{children}</div>
        {/* Resize handle */}
        <div onMouseDown={e => onResizeStart(e, id)}
            style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, cursor: 'se-resize', background: 'linear-gradient(135deg, transparent 50%, #2d3748 50%)' }} />
    </div>
);

// ─── Small chart helpers ──────────────────────────────────────────────────────
const CHART_OPTS_MINI = {
    maintainAspectRatio: false, responsive: true,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#111318', borderColor: '#2d3748', borderWidth: 1, titleColor: '#a0aec0', bodyColor: '#fff', padding: 10 } }
};
const PIE_COLORS = ['#c0f241','#a78bfa','#5bebf5','#f97316','#ef4444','#fbbf24','#34d399','#60a5fa'];

// ─── Chart Widgets ────────────────────────────────────────────────────────────
const AllocationWidget = ({ portfolio, marketData }) => {
    if (!portfolio.length) return <p style={{ color: '#4a5568', textAlign: 'center', marginTop: 20 }}>No holdings yet</p>;
    const items = portfolio.map(item => {
        const coin = marketData.find(c => c.id === String(item.symbol).toLowerCase());
        return { label: item.symbol.toUpperCase(), value: (coin?.current_price ?? 0) * item.quantity };
    }).filter(i => i.value > 0);
    const total = items.reduce((s, i) => s + i.value, 0);
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ flex: 1, minHeight: 0 }}>
                <Doughnut
                    data={{ labels: items.map(i => i.label), datasets: [{ data: items.map(i => i.value), backgroundColor: PIE_COLORS, borderWidth: 2, borderColor: '#0f1117' }] }}
                    options={{ ...CHART_OPTS_MINI, plugins: { ...CHART_OPTS_MINI.plugins, legend: { display: true, position: 'right', labels: { color: '#718096', font: { size: 11 }, boxWidth: 12 } } }, cutout: '65%' }}
                />
            </div>
            <p style={{ color: '#4a5568', fontSize: 11, textAlign: 'center', margin: 0 }}>Total: ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
    );
};

const DominanceWidget = ({ marketData }) => {
    if (!marketData.length) return <p style={{ color: '#4a5568', textAlign: 'center', marginTop: 20 }}>Loading…</p>;
    const sorted = [...marketData].sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));
    const top3 = sorted.slice(0, 3);
    const othersVal = sorted.slice(3).reduce((s, c) => s + (c.market_cap || 0), 0);
    const labels = [...top3.map(c => c.symbol.toUpperCase()), 'Others'];
    const vals   = [...top3.map(c => c.market_cap || 0), othersVal];
    return (
        <Doughnut
            data={{ labels, datasets: [{ data: vals, backgroundColor: PIE_COLORS, borderWidth: 2, borderColor: '#0f1117' }] }}
            options={{ ...CHART_OPTS_MINI, plugins: { ...CHART_OPTS_MINI.plugins, legend: { display: true, position: 'right', labels: { color: '#718096', font: { size: 11 }, boxWidth: 12 } } }, cutout: '60%' }}
        />
    );
};

const VolumeBarWidget = ({ marketData }) => {
    if (!marketData.length) return <p style={{ color: '#4a5568', textAlign: 'center', marginTop: 20 }}>Loading…</p>;
    const top5 = [...marketData].sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0)).slice(0, 5);
    return (
        <Bar
            data={{ labels: top5.map(c => c.symbol.toUpperCase()), datasets: [{ label: 'Volume 24h', data: top5.map(c => c.total_volume || 0), backgroundColor: PIE_COLORS.slice(0, 5), borderRadius: 6, borderSkipped: false }] }}
            options={{ ...CHART_OPTS_MINI, indexAxis: 'y', scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4a5568', font: { size: 10 }, callback: v => v >= 1e9 ? `$${(v/1e9).toFixed(1)}B` : `$${(v/1e6).toFixed(0)}M` } }, y: { grid: { display: false }, ticks: { color: '#a0aec0', font: { size: 11 } } } } }}
        />
    );
};

const HeatmapWidget = ({ marketData }) => {
    if (!marketData.length) return <p style={{ color: '#4a5568', textAlign: 'center', marginTop: 20 }}>Loading…</p>;
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start' }}>
            {marketData.slice(0, 20).map(coin => {
                const pct = coin.price_change_percentage_24h || 0;
                const intensity = Math.min(Math.abs(pct) / 10, 1);
                const bg = pct >= 0
                    ? `rgba(192,242,65,${0.1 + intensity * 0.5})`
                    : `rgba(239,68,68,${0.1 + intensity * 0.5})`;
                const color = pct >= 0 ? '#c0f241' : '#ef4444';
                return (
                    <div key={coin.id} style={{ padding: '6px 10px', borderRadius: 8, backgroundColor: bg, border: `1px solid ${color}33`, minWidth: 70, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{coin.symbol.toUpperCase()}</div>
                        <div style={{ fontSize: 12, fontWeight: 800, color }}>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%</div>
                    </div>
                );
            })}
        </div>
    );
};

const PnlGaugeWidget = ({ portfolio, marketData, totalInvested }) => {
    const totalValue = portfolio.reduce((s, item) => {
        const coin = marketData.find(c => c.id === String(item.symbol).toLowerCase());
        return s + (coin?.current_price ?? 0) * item.quantity;
    }, 0);
    if (!totalInvested) return <p style={{ color: '#4a5568', textAlign: 'center', marginTop: 20 }}>No trades yet</p>;
    const pnl = totalValue - totalInvested;
    const pnlPct = (pnl / totalInvested) * 100;
    const isProfit = pnl >= 0;
    const arc = Math.min(Math.abs(pnlPct) / 100, 1) * 100;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'center' }}>
            <div style={{ width: '100%', flex: 1, minHeight: 0 }}>
                <Doughnut
                    data={{ datasets: [{ data: [arc, 100 - arc], backgroundColor: [isProfit ? '#c0f241' : '#ef4444', '#1f2937'], borderWidth: 0 }] }}
                    options={{ ...CHART_OPTS_MINI, cutout: '72%', rotation: -90, circumference: 180 }}
                />
            </div>
            <div style={{ textAlign: 'center', marginTop: -20 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: isProfit ? '#c0f241' : '#ef4444' }}>{isProfit ? '+' : ''}{pnlPct.toFixed(2)}%</div>
                <div style={{ fontSize: 12, color: '#4a5568' }}>{isProfit ? '+' : '-'}${Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })} P&L</div>
            </div>
        </div>
    );
};

const SentimentRadarWidget = ({ sentimentData, fearGreed, marketData }) => {
    const vader = sentimentData?.hypeScore ?? 50;
    const fg = fearGreed?.value ?? 50;
    const avgChange = marketData.length
        ? Math.min(100, Math.max(0, 50 + marketData.slice(0, 10).reduce((s, c) => s + (c.price_change_percentage_24h || 0), 0) / 10 * 3))
        : 50;
    const volScore = marketData.length
        ? Math.min(100, (marketData[0]?.total_volume / 1e10) * 100)
        : 50;
    return (
        <Radar
            data={{
                labels: ['VADER NLP', 'Fear & Greed', 'Price Momentum', 'Volume', 'Market Sync'],
                datasets: [{
                    label: 'Market Pulse',
                    data: [vader, fg, avgChange, volScore, (vader + fg) / 2],
                    borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.15)',
                    pointBackgroundColor: '#a78bfa', pointBorderColor: '#a78bfa', borderWidth: 2
                }]
            }}
            options={{ ...CHART_OPTS_MINI, scales: { r: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.06)' }, angleLines: { color: 'rgba(255,255,255,0.06)' }, ticks: { display: false }, pointLabels: { color: '#718096', font: { size: 10 } } } }, plugins: { ...CHART_OPTS_MINI.plugins, legend: { display: false } } }}
        />
    );
};

export { CoinSentimentBadge, WidgetCard, useDragResize, WIDGETS, DEFAULT_LAYOUT, loadLayout, loadVisible, AllocationWidget, DominanceWidget, VolumeBarWidget, HeatmapWidget, PnlGaugeWidget, SentimentRadarWidget };
