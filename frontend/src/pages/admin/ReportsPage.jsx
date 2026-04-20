import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getRevenueAnalytics, exportReport } from '../../api/adminApi';

const PRODUCT_IMAGES = {
  wheat: '/images/wheat.jpg', rice: '/images/rice.jpg',
  turmeric: '/images/turmeric-powder.jpg', chili: '/images/chilli.jpg',
  chilli: '/images/chilli.jpg', coriander: '/images/Coriander.jpg',
  'garam masala': '/images/garam masala.jpg', ragi: '/images/ragi.jpg',
};
const getImg = (name) => {
  if (!name) return null;
  const key = Object.keys(PRODUCT_IMAGES).find(k => name.toLowerCase().includes(k));
  return key ? PRODUCT_IMAGES[key] : null;
};

const PERF_LABELS = ['Excellent', 'High', 'Stable', 'Growing', 'Stable'];
const PERF_ICONS = ['trending_up', 'trending_up', 'trending_flat', 'trending_up', 'trending_flat'];
const PERF_COLORS = ['text-primary', 'text-primary', 'text-on-surface-variant', 'text-primary', 'text-on-surface-variant'];

const ReportsPage = () => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) fetchAnalytics();
  }, [startDate, endDate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await getRevenueAnalytics({ startDate, endDate });
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to fetch analytics');
    } finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportReport({ startDate, endDate });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `report-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); window.URL.revokeObjectURL(url);
      toast.success('Report exported');
    } catch { toast.error('Failed to export report'); }
    finally { setExporting(false); }
  };

  const products = data?.mostOrderedProducts || [];
  const totalQty = products.reduce((s, p) => s + p.totalQuantity, 0);
  const totalOrders = data?.revenueData?.reduce((s, d) => s + d.orderCount, 0) || 0;
  const totalRevenue = data?.revenueData?.reduce((s, d) => s + d.revenue, 0) || 0;
  const topProduct = products[0]?.productName || '—';
  const maxQty = products[0]?.totalQuantity || 1;

  const stats = [
    { label: 'Total Volume', value: `${totalQty.toFixed(0)} KG`, icon: 'trending_up' },
    { label: 'Order Frequency', value: totalOrders, icon: 'shopping_cart' },
    { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(0)}`, icon: 'payments' },
    { label: 'Top Performer', value: topProduct, icon: 'star' },
  ];

  return (
    <div className="md:ml-64 min-h-screen bg-background pt-16 md:pt-0">
      <div className="p-6 md:p-8 space-y-10">

        {/* Header */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="font-headline text-4xl font-extrabold text-on-background tracking-tight">Reports &amp; Analytics</h1>
            <p className="text-on-surface-variant text-lg">Comprehensive breakdown of your mill performance</p>
          </div>
          <div className="flex items-center gap-3 bg-surface-container-low p-2 rounded-2xl shadow-sm flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest rounded-xl">
              <span className="material-symbols-outlined text-primary text-lg">calendar_today</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="bg-transparent border-none text-sm font-medium focus:outline-none text-on-surface w-32" />
              <span className="text-outline-variant text-sm">—</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="bg-transparent border-none text-sm font-medium focus:outline-none text-on-surface w-32" />
            </div>
            <button onClick={handleExport} disabled={!startDate || !endDate || exporting}
              className="px-6 py-2.5 sage-gradient text-on-primary rounded-full font-headline font-semibold text-sm flex items-center gap-2 shadow-sage hover:shadow-sage-lg transition-all active:scale-95 disabled:opacity-50">
              <span className="material-symbols-outlined text-sm">upload_file</span>
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map(s => (
            <div key={s.label} className="bg-surface-container-lowest p-6 rounded-xl shadow-card transition-all hover:shadow-card-hover group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-primary/5 text-primary rounded-xl group-hover:bg-primary group-hover:text-on-primary transition-colors">
                  <span className="material-symbols-outlined">{s.icon}</span>
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">Live</span>
              </div>
              <p className="text-sm font-medium text-on-surface-variant">{s.label}</p>
              <h3 className="font-headline text-2xl font-bold text-on-surface mt-1">{loading ? '—' : s.value}</h3>
            </div>
          ))}
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Bar Chart */}
          <div className="lg:col-span-2 bg-surface-container-low rounded-xl p-8 relative overflow-hidden">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="font-headline text-xl font-bold text-on-surface">Order Distribution</h3>
                <p className="text-sm text-on-surface-variant">Quantities across top products</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Quantity (KG)</span>
              </div>
            </div>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-on-surface-variant">No data available</div>
            ) : (
              <div className="h-64 flex items-end justify-between px-4 mt-4 gap-4">
                {products.slice(0, 5).map((p, i) => {
                  const height = Math.max(8, (p.totalQuantity / maxQty) * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-3 group/bar">
                      <div className="w-full relative flex flex-col items-center justify-end" style={{ height: '200px' }}>
                        <div className="w-full bg-primary/10 rounded-t-xl absolute inset-0"></div>
                        <div className="w-full bg-primary rounded-t-xl transition-all duration-500 group-hover/bar:brightness-110 relative"
                          style={{ height: `${height}%` }}>
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-on-background text-on-primary px-2 py-1 rounded text-xs opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {p.totalQuantity.toFixed(0)} KG
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-center">
                        {p.productName.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          </div>

          {/* Market Trends */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-card flex flex-col">
            <h3 className="font-headline text-lg font-bold text-on-surface mb-6">Market Trends</h3>
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : products.length === 0 ? (
              <p className="text-on-surface-variant text-sm">No data available</p>
            ) : (
              <div className="space-y-5 flex-1">
                {products.slice(0, 3).map((p, i) => {
                  const img = getImg(p.productName);
                  const pct = Math.round((p.totalQuantity / totalQty) * 100);
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-surface-container overflow-hidden flex-shrink-0">
                        {img ? (
                          <img src={img} alt={p.productName} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                        ) : (
                          <div className="w-full h-full bg-primary-container flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary">grain</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold font-headline text-on-surface truncate">{p.productName}</h4>
                        <p className="text-xs text-on-surface-variant">{p.totalQuantity.toFixed(0)} kg · {p.orderCount} orders</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-sm font-bold text-primary">↑ {pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Most Ordered Products Table */}
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="font-headline text-2xl font-bold text-on-surface">Most Ordered Products</h2>
          </div>
          <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-card">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low">
                <tr>
                  {['Rank', 'Product Name', 'Total Quantity', 'Order Count', 'Performance'].map((h, i) => (
                    <th key={h} className={`px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest ${i === 4 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {loading ? (
                  <tr><td colSpan="5" className="py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan="5" className="py-12 text-center text-on-surface-variant">No data for selected period</td></tr>
                ) : products.map((p, i) => (
                  <tr key={p.productId} className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">#{i + 1}</div>
                    </td>
                    <td className="px-6 py-5 font-bold text-on-background">{p.productName}</td>
                    <td className="px-6 py-5 font-medium">{p.totalQuantity.toFixed(2)} KG</td>
                    <td className="px-6 py-5 font-medium">{p.orderCount}</td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end items-center gap-1">
                        <span className={`material-symbols-outlined text-lg ${PERF_COLORS[i] || 'text-on-surface-variant'}`}>{PERF_ICONS[i] || 'trending_flat'}</span>
                        <span className={`text-xs font-bold ${PERF_COLORS[i] || 'text-on-surface-variant'}`}>{PERF_LABELS[i] || 'Stable'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pickup vs Delivery */}
        {data?.pickupVsDelivery && data.pickupVsDelivery.total > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-primary-container/30 p-6 rounded-xl flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-3xl">store</span>
              </div>
              <div>
                <h5 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Pickup Orders</h5>
                <p className="font-headline text-2xl font-extrabold text-on-surface">
                  {data.pickupVsDelivery.pickupCount} <span className="text-xs font-bold text-primary">({data.pickupVsDelivery.pickup}%)</span>
                </p>
              </div>
            </div>
            <div className="bg-secondary-container/30 p-6 rounded-xl flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-3xl">local_shipping</span>
              </div>
              <div>
                <h5 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Delivery Orders</h5>
                <p className="font-headline text-2xl font-extrabold text-on-surface">
                  {data.pickupVsDelivery.deliveryCount} <span className="text-xs font-bold text-secondary">({data.pickupVsDelivery.delivery}%)</span>
                </p>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl flex items-center gap-5 shadow-card border border-surface-container-low">
              <div className="w-14 h-14 rounded-full bg-on-surface/5 flex items-center justify-center text-on-surface">
                <span className="material-symbols-outlined text-3xl">receipt_long</span>
              </div>
              <div>
                <h5 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total Orders</h5>
                <p className="font-headline text-2xl font-extrabold text-on-surface">{data.pickupVsDelivery.total}</p>
              </div>
            </div>
          </section>
        )}

        <footer className="text-center pt-4">
          <p className="text-on-surface-variant text-sm font-medium">Flour &amp; Spice Mill Analytics</p>
          <p className="text-xs text-outline-variant mt-1">
            {startDate && endDate ? `Period: ${startDate} — ${endDate}` : 'Select a date range'}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default ReportsPage;
