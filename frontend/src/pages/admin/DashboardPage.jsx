import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardMetrics } from '../../api/adminApi';
import { toast } from 'react-toastify';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    getDashboardMetrics()
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="md:ml-64 min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="md:ml-64 min-h-screen bg-background flex items-center justify-center">
        <p className="text-on-surface-variant">No data available</p>
      </div>
    );
  }

  const { ordersToday, revenueToday, pendingOrders, orderCountsLast7Days, revenueLast7Days, mostOrderedProducts, pickupVsDelivery, lowStockCount, lowStockProducts } = data;

  // Bar chart max value for scaling
  const maxRevenue = Math.max(...(revenueLast7Days?.map(d => d.revenue) || [1]));
  const maxOrders = Math.max(...(orderCountsLast7Days?.map(d => d.count) || [1]));

  const metrics = [
    {
      label: 'Orders Today',
      value: ordersToday,
      icon: 'receipt_long',
      iconBg: 'bg-primary-container',
      iconColor: 'text-primary',
      badge: '+Today',
      badgeColor: 'text-primary bg-primary/10',
    },
    {
      label: 'Total Revenue Today',
      value: `₹${revenueToday?.toFixed(0) || 0}`,
      icon: 'payments',
      iconBg: 'bg-secondary-container',
      iconColor: 'text-secondary',
      badge: 'Today',
      badgeColor: 'text-primary bg-primary/10',
    },
    {
      label: 'Pending Orders',
      value: pendingOrders,
      icon: 'pending_actions',
      iconBg: 'bg-tertiary-container',
      iconColor: 'text-tertiary',
      badge: 'Active',
      badgeColor: 'text-primary bg-primary/10',
    },
    {
      label: 'Avg Order Value',
      value: ordersToday > 0 ? `₹${(revenueToday / ordersToday).toFixed(0)}` : '₹0',
      icon: 'shopping_cart',
      iconBg: 'bg-surface-container-high',
      iconColor: 'text-on-surface',
      badge: 'Avg',
      badgeColor: 'text-primary bg-primary/10',
    },
    {
      label: 'Low Stock',
      value: lowStockCount ?? 0,
      icon: 'inventory',
      iconBg: (lowStockCount ?? 0) > 0 ? 'bg-amber-100' : 'bg-surface-container-high',
      iconColor: (lowStockCount ?? 0) > 0 ? 'text-amber-600' : 'text-on-surface-variant',
      badge: (lowStockCount ?? 0) > 0 ? 'Alert' : 'OK',
      badgeColor: (lowStockCount ?? 0) > 0 ? 'text-amber-700 bg-amber-100' : 'text-primary bg-primary/10',
      onClick: () => navigate('/admin/products'),
    },
  ];

  return (
    <div className="md:ml-64 min-h-screen bg-background pt-16 md:pt-0">
      <main className="p-6 md:p-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h2 className="font-headline text-3xl font-extrabold text-on-background tracking-tight">
              Comprehensive Analytics
            </h2>
            <p className="text-on-surface-variant font-medium mt-1">Real-time performance metrics for your mill.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/reports')}
              className="flex items-center gap-2 bg-secondary-container text-on-secondary-container px-6 py-2.5 rounded-full font-headline font-bold hover:opacity-90 transition-all"
            >
              <span className="material-symbols-outlined text-xl">download</span>
              Export CSV
            </button>
          </div>
        </header>

        {/* Metric Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
          {metrics.map((m) => (
            <div
              key={m.label}
              onClick={m.onClick}
              className={`bg-surface-container-lowest p-6 rounded-xl shadow-card border-none ${m.onClick ? 'cursor-pointer hover:shadow-card-hover transition-shadow' : ''}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 ${m.iconBg} rounded-xl flex items-center justify-center ${m.iconColor}`}>
                  <span className="material-symbols-outlined">{m.icon}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${m.badgeColor}`}>{m.badge}</span>
              </div>
              <p className="text-sm font-medium text-on-surface-variant mb-1">{m.label}</p>
              <h3 className="font-headline text-2xl font-bold text-on-surface">{m.value}</h3>
            </div>
          ))}
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          {/* Revenue Trend */}
          <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-card">
            <div className="flex justify-between items-center mb-8">
              <h4 className="font-headline text-xl font-bold text-on-surface">Revenue Trend</h4>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Last 7 Days</span>
            </div>
            <div className="h-48 flex items-end gap-2 px-2">
              {(revenueLast7Days || []).map((d, i) => {
                const height = maxRevenue > 0 ? Math.max(8, (d.revenue / maxRevenue) * 100) : 8;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full relative flex flex-col items-center justify-end" style={{ height: '160px' }}>
                      <div
                        className="w-full bg-primary/20 rounded-t-xl relative transition-all duration-500 group-hover:bg-primary/30"
                        style={{ height: `${height}%` }}
                      >
                        <div className="absolute -top-0.5 w-full h-1 bg-primary rounded-full" />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-on-background text-on-primary px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          ₹{d.revenue?.toFixed(0)}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                      {new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Distribution */}
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-card">
            <h4 className="font-headline text-xl font-bold text-on-surface mb-8">Order Distribution</h4>
            <div className="space-y-5">
              {(mostOrderedProducts || []).slice(0, 4).map((p, i) => {
                const maxQty = mostOrderedProducts[0]?.totalQuantity || 1;
                const pct = Math.round((p.totalQuantity / maxQty) * 100);
                const colors = ['bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-primary-dim'];
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      <span>{p.productName}</span>
                      <span className="text-on-surface">{p.totalQuantity.toFixed(1)} kg</span>
                    </div>
                    <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                      <div className={`${colors[i]} h-full rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {(!mostOrderedProducts || mostOrderedProducts.length === 0) && (
                <p className="text-on-surface-variant text-sm">No data yet</p>
              )}
            </div>
          </div>
        </section>

        {/* Low Stock Alert Panel — Phase 1 */}
        {lowStockProducts && lowStockProducts.length > 0 && (
          <section className="mb-10 bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">warning</span>
                <h4 className="font-headline font-bold text-amber-800">
                  {lowStockProducts.length} Product{lowStockProducts.length > 1 ? 's' : ''} Running Low
                </h4>
              </div>
              <button
                onClick={() => navigate('/admin/products')}
                className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1"
              >
                Manage Stock <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {lowStockProducts.map((p) => (
                <div key={p._id} className="bg-white/70 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-on-surface">{p.name}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Min {p.lowStockThresholdKg} kg
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-amber-600 text-lg leading-none">
                      {p.stockKg?.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold">kg left</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Orders Table */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Top Products */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <h4 className="font-headline text-xl font-bold text-on-surface">Top Performing</h4>
            {(mostOrderedProducts || []).slice(0, 3).map((p, i) => (
              <div key={i} className="flex items-center gap-4 bg-surface-container-low p-4 rounded-xl">
                <div className="w-14 h-14 rounded-xl bg-primary-container flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary text-2xl">grain</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-on-surface text-sm truncate">{p.productName}</p>
                  <p className="text-xs text-primary font-bold">{p.totalQuantity} kg ordered</p>
                </div>
              </div>
            ))}
            {(!mostOrderedProducts || mostOrderedProducts.length === 0) && (
              <p className="text-on-surface-variant text-sm">No data yet</p>
            )}
          </div>

          {/* Orders last 7 days table */}
          <div className="lg:col-span-3 bg-surface-container-lowest rounded-xl shadow-card overflow-hidden">
            <div className="p-6 border-b border-surface-container-high flex justify-between items-center">
              <h4 className="font-headline font-extrabold text-lg text-on-surface">Daily Orders</h4>
              <button
                onClick={() => navigate('/admin/orders')}
                className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
              >
                View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low/50 text-on-surface-variant text-xs font-bold uppercase tracking-widest">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Orders</th>
                    <th className="px-6 py-4">Revenue</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {(orderCountsLast7Days || []).slice().reverse().map((d, i) => {
                    const rev = revenueLast7Days?.find(r => r.date === d.date);
                    const isPeak = d.count === Math.max(...(orderCountsLast7Days?.map(x => x.count) || [0]));
                    return (
                      <tr key={i} className="hover:bg-surface-container-low/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-on-surface text-sm">
                          {new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant">{d.count}</td>
                        <td className="px-6 py-4 text-on-surface">₹{rev?.revenue?.toFixed(0) || 0}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase ${
                            isPeak ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'
                          }`}>
                            {isPeak ? 'Peak Day' : 'Normal'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {(!orderCountsLast7Days || orderCountsLast7Days.length === 0) && (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-on-surface-variant">No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DashboardPage;
