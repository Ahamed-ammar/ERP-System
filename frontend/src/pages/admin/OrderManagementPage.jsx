import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getAllOrders, updateOrderStatus, assignDeliveryStaff } from '../../api/orderApi';
import { getAllDeliveryStaff } from '../../api/deliveryStaffApi';
import Modal from '../../components/common/Modal';
import { ORDER_STATUS, VALID_STATUS_TRANSITIONS, STATUS_DISPLAY_NAMES } from '../../utils/constants';

const STATUS_STYLES = {
  Pending: 'bg-secondary-container text-secondary',
  InProgress: 'bg-blue-100 text-blue-700',
  Ready: 'bg-purple-100 text-purple-700',
  OutForDelivery: 'bg-indigo-100 text-indigo-700',
  Delivered: 'bg-primary-container text-primary',
  Cancelled: 'bg-error-container/20 text-error',
};

const formatDate = (d) => {
  const date = new Date(d);
  return {
    date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  };
};

const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??';

const AVATAR_COLORS = [
  'bg-primary-container text-primary',
  'bg-secondary-container text-secondary',
  'bg-tertiary-container text-tertiary',
  'bg-surface-container-high text-on-surface',
];

const OrderManagementPage = () => {
  const [orders, setOrders] = useState([]);
  const [deliveryStaff, setDeliveryStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [filters, setFilters] = useState({ status: '', startDate: '', endDate: '' });
  const [visibleCount, setVisibleCount] = useState(10);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const data = await getAllOrders(params);
      setOrders(data.data?.orders || []);
    } catch {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); getAllDeliveryStaff().then(d => setDeliveryStaff(d.data || [])).catch(() => {}); }, []);
  useEffect(() => { fetchOrders(); }, [filters]);

  const handleStatusUpdate = async () => {
    if (!newStatus) return toast.error('Please select a status');
    try {
      setUpdating(true);
      await updateOrderStatus(selectedOrder._id, newStatus);
      toast.success('Status updated');
      setStatusModalOpen(false);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update status');
    } finally { setUpdating(false); }
  };

  const handleStaffAssignment = async () => {
    if (!selectedStaffId) return toast.error('Please select a staff member');
    try {
      setUpdating(true);
      await assignDeliveryStaff(selectedOrder._id, selectedStaffId);
      toast.success('Staff assigned');
      setStaffModalOpen(false);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to assign staff');
    } finally { setUpdating(false); }
  };

  const pending = orders.filter(o => o.status === 'Pending').length;
  const cancelled = orders.filter(o => o.status === 'Cancelled').length;
  const revenue = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.totalAmount || 0), 0);
  const dateRangeLabel = filters.startDate && filters.endDate
    ? `${filters.startDate} – ${filters.endDate}`
    : filters.startDate ? `From ${filters.startDate}` : 'All Time';

  const filterTabs = ['All', 'Pending', 'InProgress', 'Ready', 'Delivered', 'Cancelled'];
  const filteredByTab = activeFilter === 'All' ? orders : orders.filter(o => o.status === activeFilter);
  const displayed = filteredByTab.slice(0, visibleCount);
  const hasMore = filteredByTab.length > visibleCount;

  const stats = [
    { label: 'Total Orders', value: orders.length, icon: 'shopping_bag', iconBg: 'bg-primary-fixed', iconColor: 'text-primary', badge: 'Total', badgeStyle: 'text-primary bg-primary-container' },
    { label: 'Pending', value: pending, icon: 'pending_actions', iconBg: 'bg-secondary-fixed', iconColor: 'text-secondary', badge: 'Active', badgeStyle: 'text-on-surface-variant' },
    { label: 'Revenue', value: `₹${revenue.toFixed(0)}`, icon: 'payments', iconBg: 'bg-tertiary-container', iconColor: 'text-tertiary', badge: dateRangeLabel, badgeStyle: 'text-primary bg-primary-container' },
    { label: 'Cancelled', value: cancelled, icon: 'cancel', iconBg: 'bg-error-container/20', iconColor: 'text-error', badge: 'Total', badgeStyle: 'text-error' },
  ];

  return (
    <div className="md:ml-64 min-h-screen bg-background pt-16 md:pt-0">
      <div className="pt-8 px-6 md:px-10 pb-12">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 text-on-surface-variant text-sm mb-2">
              <span>Management</span>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-primary font-semibold">Order Management</span>
            </div>
            <h2 className="font-headline text-4xl font-extrabold tracking-tight text-on-background">Daily Manifest</h2>
            <p className="text-on-surface-variant mt-1">Oversee and manage all customer orders.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range */}
            <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2.5 rounded-full border border-outline-variant/20">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">calendar_today</span>
              <input
                type="date"
                value={filters.startDate}
                onChange={e => { setFilters(p => ({ ...p, startDate: e.target.value })); setVisibleCount(10); }}
                className="bg-transparent border-none text-sm font-medium focus:outline-none text-on-surface w-32"
              />
              <span className="text-on-surface-variant text-sm">—</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={e => { setFilters(p => ({ ...p, endDate: e.target.value })); setVisibleCount(10); }}
                className="bg-transparent border-none text-sm font-medium focus:outline-none text-on-surface w-32"
              />
              {(filters.startDate || filters.endDate) && (
                <button onClick={() => { setFilters(p => ({ ...p, startDate: '', endDate: '' })); setVisibleCount(10); }}
                  className="text-on-surface-variant hover:text-error transition-colors ml-1">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
            {/* Status filter */}
            <select
              value={filters.status}
              onChange={e => { setFilters(p => ({ ...p, status: e.target.value })); setVisibleCount(10); }}
              className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/20 rounded-full text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="">All Statuses</option>
              {Object.values(ORDER_STATUS).map(s => <option key={s} value={s}>{STATUS_DISPLAY_NAMES[s]}</option>)}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map(s => (
            <div key={s.label} className="bg-surface-container-lowest p-6 rounded-xl shadow-card flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 ${s.iconBg} rounded-full ${s.iconColor}`}>
                  <span className="material-symbols-outlined">{s.icon}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-md ${s.badgeStyle}`}>{s.badge}</span>
              </div>
              <div>
                <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">{s.label}</p>
                <p className="font-headline text-3xl font-black mt-1 text-on-background">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Orders Table */}
        <div className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden">
          {/* Table Header */}
          <div className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-high">
            <h3 className="font-headline text-xl font-bold text-on-background">Recent Orders</h3>
            <div className="flex items-center gap-3">
              <div className="flex bg-surface-container-low p-1 rounded-full">
                {filterTabs.map(tab => (
                  <button key={tab} onClick={() => { setActiveFilter(tab); setVisibleCount(10); }}
                    className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${activeFilter === tab ? 'bg-surface-container-lowest shadow-sm text-on-background' : 'text-on-surface-variant hover:text-on-surface'}`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  {['Order ID', 'Customer', 'Items', 'Date', 'Total', 'Status', 'Actions'].map(h => (
                    <th key={h} className={`py-4 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-widest ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {loading ? (
                  <tr><td colSpan="7" className="py-16 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></td></tr>
                ) : displayed.length === 0 ? (
                  <tr><td colSpan="7" className="py-16 text-center text-on-surface-variant">No orders found</td></tr>
                ) : displayed.map((order, idx) => {
                  const { date, time } = formatDate(order.createdAt);
                  const initials = getInitials(order.customerId?.name || order.customerId?.username);
                  const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  return (
                    <tr key={order._id} className="hover:bg-surface-container-low/30 transition-colors group">
                      <td className="py-5 px-6 font-mono text-sm font-bold text-primary">
                        #{order._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center font-bold text-xs flex-shrink-0`}>
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-bold leading-none text-on-surface">{order.customerId?.name || order.customerId?.username || 'N/A'}</p>
                            <p className="text-[10px] text-on-surface-variant mt-0.5">{order.customerId?.phone || order.customerId?.email || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                          <span className="material-symbols-outlined text-sm">grain</span>
                          <span>{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</span>
                        </div>
                        {order.items?.[0] && (
                          <p className="text-xs font-medium text-on-surface mt-0.5">{order.items[0].productName}</p>
                        )}
                      </td>
                      <td className="py-5 px-6">
                        <p className="text-sm font-medium text-on-surface">{date}</p>
                        <p className="text-[10px] text-on-surface-variant">{time}</p>
                      </td>
                      <td className="py-5 px-6">
                        <p className="text-sm font-black text-on-background">₹{order.totalAmount?.toFixed(0)}</p>
                      </td>
                      <td className="py-5 px-6 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[order.status] || 'bg-surface-container-high text-on-surface-variant'}`}>
                          {STATUS_DISPLAY_NAMES[order.status] || order.status}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setSelectedOrder(order); setDetailsModalOpen(true); }}
                            className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-primary-container/20" title="View Details">
                            <span className="material-symbols-outlined text-xl">visibility</span>
                          </button>
                          <button onClick={() => { setSelectedOrder(order); setNewStatus(''); setStatusModalOpen(true); }}
                            className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-primary-container/20" title="Update Status">
                            <span className="material-symbols-outlined text-xl">edit</span>
                          </button>
                          {order.status === ORDER_STATUS.OUT_FOR_DELIVERY && (
                            <button onClick={() => { setSelectedOrder(order); setSelectedStaffId(order.deliveryStaffId?._id || ''); setStaffModalOpen(true); }}
                              className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-primary-container/20" title="Assign Staff">
                              <span className="material-symbols-outlined text-xl">person_add</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-on-surface-variant font-medium">
              Showing {Math.min(visibleCount, filteredByTab.length)} of {filteredByTab.length} orders
              {(filters.startDate || filters.endDate) && (
                <span className="ml-2 text-primary font-bold">· {dateRangeLabel}</span>
              )}
            </p>
            {hasMore && (
              <button
                onClick={() => setVisibleCount(v => v + 10)}
                className="flex items-center gap-2 px-6 py-2.5 sage-gradient text-on-primary font-headline font-bold rounded-full shadow-sage hover:shadow-sage-lg active:scale-95 transition-all text-sm"
              >
                <span className="material-symbols-outlined text-sm">expand_more</span>
                Load More ({filteredByTab.length - visibleCount} remaining)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      <Modal isOpen={detailsModalOpen} onClose={() => setDetailsModalOpen(false)}
        title={`Order #${selectedOrder?._id.slice(-6).toUpperCase()}`}>
        {selectedOrder && (
          <div className="space-y-4">
            <div className="bg-surface-container-low rounded-xl p-4">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Customer</p>
              <p className="font-bold text-on-surface">{selectedOrder.customerId?.name || 'N/A'}</p>
              <p className="text-sm text-on-surface-variant">{selectedOrder.customerId?.phone || selectedOrder.customerId?.email || ''}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Ordered Items</p>
              <div className="space-y-2">
                {selectedOrder.items?.map((item, i) => (
                  <div key={i} className="flex justify-between items-start bg-surface-container-low rounded-xl p-4">
                    <div>
                      <p className="font-bold text-on-surface text-sm">{item.productName}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {item.quantity} kg · {item.grindType} · {item.orderType === 'serviceOnly' ? 'Service Only' : 'Buy + Grinding'}
                      </p>
                    </div>
                    <p className="font-bold text-on-surface">₹{item.itemTotal?.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
            {selectedOrder.deliveryAddress && (
              <div className="bg-surface-container-low rounded-xl p-4">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Delivery Address</p>
                <p className="text-sm text-on-surface-variant">
                  {selectedOrder.deliveryAddress.doorNo}, {selectedOrder.deliveryAddress.houseName}, {selectedOrder.deliveryAddress.streetType}
                  {selectedOrder.deliveryAddress.landmark ? ` · ${selectedOrder.deliveryAddress.landmark}` : ''}
                </p>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-outline-variant/10">
              <span className="font-headline font-bold text-on-surface">Grand Total</span>
              <span className="font-headline font-extrabold text-xl text-primary">₹{selectedOrder.totalAmount?.toFixed(2)}</span>
            </div>
            <button onClick={() => setDetailsModalOpen(false)}
              className="w-full py-3 bg-surface-container-low text-on-surface font-headline font-bold rounded-full hover:bg-surface-container-high transition-colors">
              Close
            </button>
          </div>
        )}
      </Modal>

      {/* Status Update Modal */}
      <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Update Order Status">
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            Current: <span className="font-bold text-on-surface">{selectedOrder && STATUS_DISPLAY_NAMES[selectedOrder.status]}</span>
          </p>
          <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
            className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:outline-none font-medium">
            <option value="">Select new status</option>
            {selectedOrder && (VALID_STATUS_TRANSITIONS[selectedOrder.status] || []).map(s => (
              <option key={s} value={s}>{STATUS_DISPLAY_NAMES[s]}</option>
            ))}
          </select>
          <div className="flex gap-3">
            <button onClick={handleStatusUpdate} disabled={updating || !newStatus}
              className="flex-1 sage-gradient text-on-primary font-headline font-bold py-3 rounded-full shadow-sage hover:shadow-sage-lg active:scale-95 transition-all disabled:opacity-50">
              {updating ? 'Updating...' : 'Update Status'}
            </button>
            <button onClick={() => setStatusModalOpen(false)}
              className="flex-1 bg-surface-container-low text-on-surface font-headline font-bold py-3 rounded-full hover:bg-surface-container-high transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Staff Assignment Modal */}
      <Modal isOpen={staffModalOpen} onClose={() => setStaffModalOpen(false)} title="Assign Delivery Staff">
        <div className="space-y-4">
          <select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)}
            className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:outline-none font-medium">
            <option value="">Select staff member</option>
            {deliveryStaff.filter(s => s.isActive).map(s => (
              <option key={s._id} value={s._id}>{s.name} — {s.phone}</option>
            ))}
          </select>
          <div className="flex gap-3">
            <button onClick={handleStaffAssignment} disabled={updating || !selectedStaffId}
              className="flex-1 sage-gradient text-on-primary font-headline font-bold py-3 rounded-full shadow-sage hover:shadow-sage-lg active:scale-95 transition-all disabled:opacity-50">
              {updating ? 'Assigning...' : 'Assign Staff'}
            </button>
            <button onClick={() => setStaffModalOpen(false)}
              className="flex-1 bg-surface-container-low text-on-surface font-headline font-bold py-3 rounded-full hover:bg-surface-container-high transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrderManagementPage;
