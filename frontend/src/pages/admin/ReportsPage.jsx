import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  getRevenueAnalytics,
  exportReport,
  exportEnhancedReport,
  getMonthlyComparison,
  getGrindBreakdown,
  getOrderTypeBreakdown,
  getStaffPerformance,
} from '../../api/adminApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) => n?.toFixed(0) ?? '0';
const fmtKg = (n) => (n ?? 0).toFixed(1);
const fmtPct = (n) => (n >= 0 ? '+' : '') + n + '%';

const QUICK_RANGES = [
  { label: 'Today',       getDates: () => { const d = today(); return [d, d]; } },
  { label: 'This Week',   getDates: () => { const d = today(); const s = new Date(d); s.setDate(s.getDate() - s.getDay()); return [iso(s), d]; } },
  { label: 'This Month',  getDates: () => { const d = today(); const s = `${d.slice(0,7)}-01`; return [s, d]; } },
  { label: 'Last 30 Days',getDates: () => { const e = today(); const s = new Date(); s.setDate(s.getDate() - 29); return [iso(s), e]; } },
  { label: 'Last 3 Months',getDates:() => { const e = today(); const s = new Date(); s.setMonth(s.getMonth() - 3); return [iso(s), e]; } },
];

const today = () => new Date().toISOString().split('T')[0];
const iso   = (d) => d.toISOString().split('T')[0];

const GRIND_COLORS = { Fine: 'bg-primary', Medium: 'bg-secondary', Coarse: 'bg-tertiary' };
const GRIND_TEXT   = { Fine: 'text-primary', Medium: 'text-secondary', Coarse: 'text-tertiary' };

const TrendBadge = ({ change }) => {
  const up    = change > 0;
  const zero  = change === 0;
  const color = up ? 'text-green-600 bg-green-50' : zero ? 'text-on-surface-variant bg-surface-container' : 'text-error bg-error-container/20';
  const icon  = up ? 'arrow_upward' : zero ? 'remove' : 'arrow_downward';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      <span className="material-symbols-outlined text-[13px]">{icon}</span>
      {Math.abs(change)}%
    </span>
  );
};

// ─── ReportsPage ──────────────────────────────────────────────────────────────

const ReportsPage = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [activePreset, setActivePreset] = useState('Last 30 Days');

  // Data state
  const [revenueData,    setRevenueData]    = useState(null);
  const [monthly,        setMonthly]        = useState(null);
  const [grindData,      setGrindData]      = useState([]);
  const [orderTypeData,  setOrderTypeData]  = useState([]);
  const [staffData,      setStaffData]      = useState([]);

  // Loading state per section
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const [exporting,      setExporting]      = useState(false);
  const [exportingFull,  setExportingFull]  = useState(false);

  // Apply quick preset
  const applyPreset = (preset) => {
    const [s, e] = preset.getDates();
    setStartDate(s);
    setEndDate(e);
    setActivePreset(preset.label);
  };

  // On mount: apply "Last 30 Days"
  useEffect(() => {
    const preset = QUICK_RANGES.find(p => p.label === 'Last 30 Days');
    applyPreset(preset);
  }, []);

  // Fetch context data once (monthly comparison + staff) — not date-range dependent
  useEffect(() => {
    setLoadingContext(true);
    Promise.all([
      getMonthlyComparison().then(r => setMonthly(r.data)).catch(() => {}),
      getStaffPerformance().then(r => setStaffData(r.data || [])).catch(() => {}),
    ]).finally(() => setLoadingContext(false));
  }, []);

  // Fetch date-range analytics when dates change
  const fetchRangeData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoadingRevenue(true);
    try {
      const [rev, grind, orderType] = await Promise.all([
        getRevenueAnalytics({ startDate, endDate }),
        getGrindBreakdown({ startDate, endDate }),
        getOrderTypeBreakdown({ startDate, endDate }),
      ]);
      setRevenueData(rev.data);
      setGrindData(grind.data || []);
      setOrderTypeData(orderType.data || []);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to fetch analytics');
    } finally { setLoadingRevenue(false); }
  }, [startDate, endDate]);

  useEffect(() => { fetchRangeData(); }, [fetchRangeData]);

  // Export helpers
  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportReport({ startDate, endDate });
      triggerDownload(blob, `report-${startDate}-to-${endDate}.csv`);
      toast.success('Basic report exported');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const handleExportFull = async () => {
    try {
      setExportingFull(true);
      const blob = await exportEnhancedReport({ startDate, endDate });
      triggerDownload(blob, `detailed-report-${startDate}-to-${endDate}.csv`);
      toast.success('Detailed report exported');
    } catch { toast.error('Export failed'); }
    finally { setExportingFull(false); }
  };

  const triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); window.URL.revokeObjectURL(url);
  };

  // Derived totals for selected range
  const totalRevenue  = revenueData?.revenueData?.reduce((s, d) => s + d.revenue,    0) ?? 0;
  const totalOrders   = revenueData?.revenueData?.reduce((s, d) => s + d.orderCount, 0) ?? 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const topProduct    = revenueData?.mostOrderedProducts?.[0]?.productName ?? '—';
  const maxBarRevenue = Math.max(...(revenueData?.revenueData?.map(d => d.revenue) ?? [1]));
  const maxGrind      = Math.max(...(grindData.map(g => g.totalKg) ?? [1]));

  return (
    <div className="md:ml-64 min-h-screen bg-background pt-16 md:pt-0">
      <div className="p-6 md:p-8 space-y-10">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <section className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div>
            <nav className="flex items-center gap-2 text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest mb-2">
              <span>Admin</span>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-primary">Reports & Analytics</span>
            </nav>
            <h1 className="font-headline text-4xl font-extrabold text-on-background tracking-tight">Analytics Centre</h1>
            <p className="text-on-surface-variant mt-1">Comprehensive performance overview for your mill</p>
          </div>

          {/* Date controls */}
          <div className="flex flex-col gap-3 w-full lg:w-auto">
            {/* Quick presets */}
            <div className="flex flex-wrap gap-2">
              {QUICK_RANGES.map(p => (
                <button key={p.label} onClick={() => applyPreset(p)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
                    activePreset === p.label
                      ? 'sage-gradient text-on-primary shadow-sage'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
            {/* Custom date range */}
            <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2.5 rounded-full">
              <span className="material-symbols-outlined text-primary text-lg">calendar_today</span>
              <input type="date" value={startDate}
                onChange={e => { setStartDate(e.target.value); setActivePreset(''); }}
                className="bg-transparent border-none text-sm font-medium focus:outline-none text-on-surface w-32" />
              <span className="text-on-surface-variant text-sm">—</span>
              <input type="date" value={endDate}
                onChange={e => { setEndDate(e.target.value); setActivePreset(''); }}
                className="bg-transparent border-none text-sm font-medium focus:outline-none text-on-surface w-32" />
            </div>
            {/* Export buttons */}
            <div className="flex gap-2">
              <button onClick={handleExport} disabled={!startDate || !endDate || exporting}
                className="flex-1 px-4 py-2.5 bg-surface-container-low text-on-surface rounded-full font-headline font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-surface-container-high transition-all disabled:opacity-50">
                <span className="material-symbols-outlined text-sm">upload_file</span>
                {exporting ? 'Exporting...' : 'Basic CSV'}
              </button>
              <button onClick={handleExportFull} disabled={!startDate || !endDate || exportingFull}
                className="flex-1 px-4 py-2.5 sage-gradient text-on-primary rounded-full font-headline font-bold text-sm flex items-center justify-center gap-1.5 shadow-sage hover:shadow-sage-lg transition-all disabled:opacity-50">
                <span className="material-symbols-outlined text-sm">table_chart</span>
                {exportingFull ? 'Exporting...' : 'Detailed CSV'}
              </button>
            </div>
          </div>
        </section>

        {/* ── Monthly Comparison ─────────────────────────────────────────── */}
        {monthly && (
          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-4">Month-on-Month</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'This Month Revenue',
                  value: `₹${fmt(monthly.current.revenue)}`,
                  sub: `vs ₹${fmt(monthly.previous.revenue)} last month`,
                  change: monthly.revenueChange,
                  icon: 'payments',
                  iconBg: 'bg-primary-container',
                  iconColor: 'text-primary',
                },
                {
                  label: 'This Month Orders',
                  value: monthly.current.orders,
                  sub: `vs ${monthly.previous.orders} last month`,
                  change: monthly.ordersChange,
                  icon: 'shopping_bag',
                  iconBg: 'bg-secondary-container',
                  iconColor: 'text-secondary',
                },
                {
                  label: 'Avg. Order Value',
                  value: monthly.current.orders > 0 ? `₹${fmt(monthly.current.revenue / monthly.current.orders)}` : '₹0',
                  sub: 'current month',
                  change: null,
                  icon: 'trending_up',
                  iconBg: 'bg-tertiary-container',
                  iconColor: 'text-tertiary',
                },
                {
                  label: 'Revenue Growth',
                  value: fmtPct(monthly.revenueChange),
                  sub: 'vs previous month',
                  change: monthly.revenueChange,
                  icon: 'analytics',
                  iconBg: monthly.revenueChange >= 0 ? 'bg-primary-container' : 'bg-error-container/20',
                  iconColor: monthly.revenueChange >= 0 ? 'text-primary' : 'text-error',
                },
              ].map(m => (
                <div key={m.label} className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 ${m.iconBg} rounded-xl flex items-center justify-center ${m.iconColor}`}>
                      <span className="material-symbols-outlined">{m.icon}</span>
                    </div>
                    {m.change !== null && <TrendBadge change={m.change} />}
                  </div>
                  <p className="text-sm text-on-surface-variant mb-1">{m.label}</p>
                  <h3 className="font-headline text-2xl font-bold text-on-surface">{loadingContext ? '—' : m.value}</h3>
                  <p className="text-xs text-on-surface-variant mt-1">{m.sub}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Period Summary ─────────────────────────────────────────────── */}
        <section>
          <h2 className="font-headline text-xl font-bold text-on-surface mb-4">
            Period Summary
            <span className="text-sm font-medium text-on-surface-variant ml-2">
              {startDate && endDate ? `${startDate} — ${endDate}` : ''}
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue',    value: `₹${fmt(totalRevenue)}`,          icon: 'payments',      iconBg: 'bg-primary-container',   iconColor: 'text-primary' },
              { label: 'Total Orders',     value: totalOrders,                        icon: 'receipt_long',  iconBg: 'bg-secondary-container', iconColor: 'text-secondary' },
              { label: 'Avg. Order Value', value: `₹${fmt(avgOrderValue)}`,          icon: 'calculate',     iconBg: 'bg-tertiary-container',  iconColor: 'text-tertiary' },
              { label: 'Top Product',      value: topProduct,                         icon: 'star',          iconBg: 'bg-surface-container-high', iconColor: 'text-on-surface' },
            ].map(s => (
              <div key={s.label} className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
                <div className={`w-10 h-10 ${s.iconBg} rounded-xl flex items-center justify-center ${s.iconColor} mb-4`}>
                  <span className="material-symbols-outlined">{s.icon}</span>
                </div>
                <p className="text-sm text-on-surface-variant mb-1">{s.label}</p>
                <h3 className="font-headline text-2xl font-bold text-on-surface truncate">
                  {loadingRevenue ? '—' : s.value}
                </h3>
              </div>
            ))}
          </div>
        </section>

        {/* ── Revenue Bar Chart ───────────────────────────────────────────── */}
        <section className="bg-surface-container-lowest rounded-xl shadow-card p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-headline text-xl font-bold text-on-surface">Revenue Trend</h2>
              <p className="text-sm text-on-surface-variant">Daily revenue for selected period</p>
            </div>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">₹ Revenue / Day</span>
          </div>
          {loadingRevenue ? (
            <div className="h-48 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : !revenueData?.revenueData?.length ? (
            <div className="h-48 flex items-center justify-center text-on-surface-variant">No data for selected period</div>
          ) : (
            <div className="h-48 flex items-end gap-1 overflow-x-auto">
              {revenueData.revenueData.map((d, i) => {
                const height = maxBarRevenue > 0 ? Math.max(4, (d.revenue / maxBarRevenue) * 100) : 4;
                return (
                  <div key={i} className="flex-1 min-w-[28px] flex flex-col items-center gap-1 group">
                    <div className="w-full relative flex flex-col items-center justify-end" style={{ height: '160px' }}>
                      <div className="w-full bg-primary/20 rounded-t-lg relative transition-all duration-500 group-hover:bg-primary/40"
                        style={{ height: `${height}%` }}>
                        <div className="absolute -top-0.5 w-full h-1 bg-primary rounded-full" />
                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-on-background text-on-primary px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                          ₹{fmt(d.revenue)} · {d.orderCount} orders
                        </div>
                      </div>
                    </div>
                    <span className="text-[8px] font-bold text-on-surface-variant">
                      {new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Grind + Order Type side by side ─────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Grind Type Breakdown */}
          <div className="bg-surface-container-lowest rounded-xl shadow-card p-8">
            <h2 className="font-headline text-xl font-bold text-on-surface mb-2">Grind Type Breakdown</h2>
            <p className="text-sm text-on-surface-variant mb-6">Distribution of Fine / Medium / Coarse orders</p>
            {loadingRevenue ? (
              <div className="h-32 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : grindData.length === 0 ? (
              <p className="text-on-surface-variant text-sm">No data for selected period</p>
            ) : (
              <div className="space-y-4">
                {grindData.map(g => (
                  <div key={g.grindType}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${GRIND_COLORS[g.grindType] ?? 'bg-outline'}`} />
                        <span className="text-sm font-bold text-on-surface">{g.grindType}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                        <span className="font-bold">{fmtKg(g.totalKg)} kg</span>
                        <span>{g.orderCount} orders</span>
                        <span className={`font-extrabold ${GRIND_TEXT[g.grindType] ?? ''}`}>{g.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`${GRIND_COLORS[g.grindType] ?? 'bg-outline'} h-full rounded-full transition-all duration-700`}
                        style={{ width: `${g.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-surface-container-high flex justify-between text-xs font-bold text-on-surface-variant">
                  <span>Total: {fmtKg(grindData.reduce((s, g) => s + g.totalKg, 0))} kg</span>
                  <span>₹{fmt(grindData.reduce((s, g) => s + g.revenue, 0))} revenue</span>
                </div>
              </div>
            )}
          </div>

          {/* Order Type Breakdown */}
          <div className="bg-surface-container-lowest rounded-xl shadow-card p-8">
            <h2 className="font-headline text-xl font-bold text-on-surface mb-2">Order Type Revenue</h2>
            <p className="text-sm text-on-surface-variant mb-6">Service Only vs Buy & Service contribution</p>
            {loadingRevenue ? (
              <div className="h-32 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : orderTypeData.length === 0 ? (
              <p className="text-on-surface-variant text-sm">No data for selected period</p>
            ) : (
              <div className="space-y-6">
                {orderTypeData.map((o, i) => (
                  <div key={o.orderType} className={`p-5 rounded-xl ${i === 0 ? 'bg-primary-container/20' : 'bg-secondary-container/20'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-headline font-bold text-on-surface">{o.label}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">{o.orderCount} order items · {fmtKg(o.totalKg)} kg</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-headline text-2xl font-extrabold ${i === 0 ? 'text-primary' : 'text-secondary'}`}>
                          ₹{fmt(o.revenue)}
                        </p>
                        <p className="text-xs text-on-surface-variant">{o.revenueShare}% of revenue</p>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-high h-2 rounded-full">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${i === 0 ? 'bg-primary' : 'bg-secondary'}`}
                        style={{ width: `${o.revenueShare}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Product Performance ─────────────────────────────────────────── */}
        <section>
          <h2 className="font-headline text-xl font-bold text-on-surface mb-4">Product Performance</h2>
          <div className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low">
                <tr>
                  {['Rank', 'Product', 'Total Quantity', 'Order Count', 'Share'].map((h, i) => (
                    <th key={h} className={`px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest ${i >= 2 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {loadingRevenue ? (
                  <tr><td colSpan="5" className="py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" /></td></tr>
                ) : !revenueData?.mostOrderedProducts?.length ? (
                  <tr><td colSpan="5" className="py-12 text-center text-on-surface-variant">No data for selected period</td></tr>
                ) : (() => {
                  const products = revenueData.mostOrderedProducts;
                  const totalKg  = products.reduce((s, p) => s + p.totalQuantity, 0);
                  return products.map((p, i) => (
                    <tr key={p.productId} className="hover:bg-primary/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {i + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-on-surface">{p.productName}</td>
                      <td className="px-6 py-4 text-right font-medium">{fmtKg(p.totalQuantity)} kg</td>
                      <td className="px-6 py-4 text-right font-medium">{p.orderCount}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                            <div className="bg-primary h-full rounded-full"
                              style={{ width: `${Math.round((p.totalQuantity / totalKg) * 100)}%` }} />
                          </div>
                          <span className="text-xs font-bold text-primary w-8 text-right">
                            {Math.round((p.totalQuantity / totalKg) * 100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Delivery Split ──────────────────────────────────────────────── */}
        {revenueData?.pickupVsDelivery?.total > 0 && (
          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-4">Delivery Split</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  label: 'Pickup Orders',
                  value: revenueData.pickupVsDelivery.pickupCount,
                  pct: revenueData.pickupVsDelivery.pickup,
                  icon: 'storefront',
                  bg: 'bg-primary-container/30',
                  iconBg: 'bg-primary/10',
                  iconColor: 'text-primary',
                  pctColor: 'text-primary',
                },
                {
                  label: 'Delivery Orders',
                  value: revenueData.pickupVsDelivery.deliveryCount,
                  pct: revenueData.pickupVsDelivery.delivery,
                  icon: 'local_shipping',
                  bg: 'bg-secondary-container/30',
                  iconBg: 'bg-secondary/10',
                  iconColor: 'text-secondary',
                  pctColor: 'text-secondary',
                },
                {
                  label: 'Total Orders',
                  value: revenueData.pickupVsDelivery.total,
                  pct: 100,
                  icon: 'receipt_long',
                  bg: 'bg-surface-container-lowest',
                  iconBg: 'bg-on-surface/5',
                  iconColor: 'text-on-surface',
                  pctColor: 'text-on-surface-variant',
                },
              ].map(s => (
                <div key={s.label} className={`${s.bg} p-6 rounded-xl flex items-center gap-5`}>
                  <div className={`w-14 h-14 rounded-full ${s.iconBg} flex items-center justify-center ${s.iconColor}`}>
                    <span className="material-symbols-outlined text-3xl">{s.icon}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">{s.label}</p>
                    <p className="font-headline text-2xl font-extrabold text-on-surface">
                      {s.value} <span className={`text-xs font-bold ${s.pctColor}`}>({s.pct}%)</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Delivery Staff Performance ──────────────────────────────────── */}
        <section>
          <h2 className="font-headline text-xl font-bold text-on-surface mb-4">Delivery Staff Performance</h2>
          <div className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low">
                <tr>
                  {['Staff Member', 'Phone', 'Assigned', 'Delivered', 'Cancelled', 'Completion', 'Revenue'].map((h, i) => (
                    <th key={h} className={`px-5 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest ${i >= 2 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {loadingContext ? (
                  <tr><td colSpan="7" className="py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" /></td></tr>
                ) : staffData.length === 0 ? (
                  <tr><td colSpan="7" className="py-12 text-center text-on-surface-variant">No delivery assignments yet</td></tr>
                ) : staffData.map(s => (
                  <tr key={s.staffId} className="hover:bg-primary/5 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-primary font-bold text-xs">
                          {s.staffName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-on-surface">{s.staffName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant text-sm">{s.staffPhone}</td>
                    <td className="px-5 py-4 text-right font-medium">{s.totalAssigned}</td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-medium text-primary">{s.delivered}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={`font-medium ${s.cancelled > 0 ? 'text-error' : 'text-on-surface-variant'}`}>{s.cancelled}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${s.completionRate >= 80 ? 'bg-primary' : s.completionRate >= 50 ? 'bg-amber-500' : 'bg-error'}`}
                            style={{ width: `${s.completionRate}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold w-8 text-right ${s.completionRate >= 80 ? 'text-primary' : s.completionRate >= 50 ? 'text-amber-600' : 'text-error'}`}>
                          {s.completionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-on-surface">
                      ₹{fmt(s.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center pt-4 pb-8">
          <p className="text-on-surface-variant text-sm font-medium">Flour &amp; Spice Mill Analytics Centre</p>
          {startDate && endDate && (
            <p className="text-xs text-outline-variant mt-1">Period: {startDate} — {endDate}</p>
          )}
        </footer>

      </div>
    </div>
  );
};

export default ReportsPage;
