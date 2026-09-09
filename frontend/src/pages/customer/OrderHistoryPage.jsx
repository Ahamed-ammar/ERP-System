import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomerOrders, cancelOrder } from '../../api/customerApi';
import { useCart } from '../../hooks/useCart';
import { toast } from 'react-toastify';
import CustomerHeader from '../../components/common/CustomerHeader';

const STATUS_STYLES = {
  Pending: 'bg-[#fef3c7] text-[#92400e]',
  InProgress: 'bg-blue-100 text-blue-800',
  Ready: 'bg-purple-100 text-purple-800',
  OutForDelivery: 'bg-indigo-100 text-indigo-800',
  Delivered: 'bg-secondary-container text-on-secondary-container',
  Cancelled: 'bg-surface-container-highest text-on-surface-variant',
};

const STATUS_LABELS = {
  Pending: 'Pending', InProgress: 'In Progress', Ready: 'Ready',
  OutForDelivery: 'Out for Delivery', Delivered: 'Delivered', Cancelled: 'Cancelled',
};

const PRODUCT_IMAGES = {
  wheat: '/images/wheat.jpg', rice: '/images/rice.jpg',
  turmeric: '/images/turmeric-powder.jpg', chili: '/images/chilli.jpg',
  chilli: '/images/chilli.jpg', coriander: '/images/Coriander.jpg',
  'garam masala': '/images/garam masala.jpg', ragi: '/images/ragi.jpg',
};

const getItemImage = (name) => {
  if (!name) return null;
  const key = Object.keys(PRODUCT_IMAGES).find(k => name.toLowerCase().includes(k));
  return key ? PRODUCT_IMAGES[key] : null;
};

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const getItemsSummary = (items) => {
  if (!items?.length) return 'No items';
  if (items.length === 1) return `${items[0].productName} (${items[0].quantity}kg)`;
  return `${items[0].productName} and ${items.length - 1} more item${items.length > 2 ? 's' : ''}`;
};

// ── Order Card ────────────────────────────────────────────────────────────────
const OrderCard = ({ order, onReorder, onCancel, isCancelling }) => {
  const [expanded, setExpanded] = useState(false);
  const firstItem = order.items?.[0];
  const img = getItemImage(firstItem?.productName);

  return (
    <div className="bg-surface-container-lowest p-8 rounded-xl shadow-card hover:shadow-card-hover transition-shadow">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="space-y-1">
          <p className="text-xs font-bold text-on-surface-variant font-label tracking-wider uppercase">
            Order ID: {order._id.slice(-12).toUpperCase()}
          </p>
          <p className="text-on-surface font-medium">{formatDate(order.createdAt)}</p>
        </div>
        <span className={`px-4 py-1.5 text-xs font-bold rounded-full ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-600'}`}>
          {STATUS_LABELS[order.status] || order.status}
        </span>
        {order.deliveryType === 'Pickup' && (
          <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full bg-primary-container text-primary">
            <span className="material-symbols-outlined text-sm">storefront</span>
            Pickup
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col md:flex-row md:items-center gap-8 mb-8">
        {/* Thumbnail */}
        <div className="w-24 h-24 rounded-xl bg-surface-container overflow-hidden flex-shrink-0">
          {img ? (
            <img src={img} alt={firstItem?.productName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">grain</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-grow">
          <h3 className="font-headline text-xl font-bold text-on-surface mb-1">
            {getItemsSummary(order.items)}
          </h3>
          {order.items?.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-on-surface-variant font-medium mt-1">
              {order.items.slice(0, 2).map((item, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">restaurant</span>
                  {item.quantity}kg {item.productName}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-primary font-bold text-sm hover:underline underline-offset-4 transition-all"
          >
            {expanded ? 'Hide Details' : 'View Details'}
            <span className="material-symbols-outlined text-sm">
              {expanded ? 'expand_less' : 'chevron_right'}
            </span>
          </button>
        </div>

        {/* Total */}
        <div className="text-right flex-shrink-0">
          <p className="font-headline text-2xl font-extrabold text-on-surface tracking-tight">
            ₹{order.totalAmount?.toFixed(2)}
          </p>
          <p className="text-xs text-on-surface-variant font-medium mt-1">Inclusive of all charges</p>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mb-8 pt-6 border-t border-surface-container-high space-y-3">
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between items-start text-sm">
              <div>
                <p className="font-bold text-on-surface">{item.productName}</p>
                <p className="text-on-surface-variant text-xs mt-0.5">
                  {item.quantity} kg · {item.grindType} · {item.orderType === 'serviceOnly' ? 'Service Only' : 'Buy + Grinding'}
                </p>
              </div>
              <p className="font-bold text-on-surface ml-4">₹{item.itemTotal?.toFixed(2)}</p>
            </div>
          ))}
          {order.deliveryAddress && (
            <div className="pt-3 border-t border-surface-container-high">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                {order.deliveryType === 'Pickup' ? 'Pickup from Mill' : 'Delivery Address'}
              </p>
              {order.deliveryType === 'Pickup' ? (
                <p className="text-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-primary text-base">storefront</span>
                  Come collect at the mill when status shows Ready
                </p>
              ) : (
                <p className="text-sm text-on-surface-variant">
                  {order.deliveryAddress.name} · {order.deliveryAddress.phone}<br />
                  {order.deliveryAddress.doorNo}, {order.deliveryAddress.houseName}, {order.deliveryAddress.streetType}
                  {order.deliveryAddress.landmark ? ` · ${order.deliveryAddress.landmark}` : ''}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-4 pt-8 border-t border-surface-container-high">
        <button
          onClick={() => onReorder(order)}
          className="flex-1 md:flex-none px-8 py-3.5 sage-gradient text-on-primary font-headline font-bold rounded-full shadow-sage hover:shadow-sage-lg active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-xl">refresh</span>
          Reorder
        </button>
        {order.status === 'Pending' && (
          <button
            onClick={() => onCancel(order._id)}
            disabled={isCancelling}
            className="flex-1 md:flex-none px-8 py-3.5 bg-surface-container-low text-on-surface hover:bg-surface-container-high font-headline font-bold rounded-full active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Order'}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const OrderHistoryPage = () => {
  const navigate = useNavigate();
  const { clearCart, resetCartOnTypeChange, addToCart } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    getCustomerOrders()
      .then(res => setOrders(
        (res.data.orders || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      ))
      .catch(() => toast.error('Failed to load order history'))
      .finally(() => setLoading(false));
  }, []);

  const handleReorder = (order) => {
    try {
      clearCart();
      resetCartOnTypeChange(order.orderType);
      order.items.forEach(item =>
        addToCart(
          { _id: item.productId, name: item.productName, rawMaterialPricePerKg: item.rawMaterialPriceSnapshot, grindingChargePerKg: item.grindingChargeSnapshot },
          item.quantity, item.grindType, item.orderType
        )
      );
      toast.success('Order items added to cart');
      navigate('/order/products');
    } catch {
      toast.error('Failed to reorder. Please try again.');
    }
  };

  const handleCancel = async (orderId) => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      setCancellingId(orderId);
      await cancelOrder(orderId);
      toast.success('Order cancelled successfully');
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'Cancelled' } : o));
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to cancel order');
    } finally {
      setCancellingId(null);
    }
  };

  const ongoing = orders.filter(o => ['Pending', 'InProgress', 'Ready', 'OutForDelivery'].includes(o.status)).length;
  const completed = orders.filter(o => o.status === 'Delivered').length;

  const filterOptions = [
    { key: 'All', label: 'All Orders', count: orders.length },
    { key: 'ongoing', label: 'Ongoing', count: ongoing },
    { key: 'Delivered', label: 'Completed', count: completed },
  ];

  const filtered = filter === 'All' ? orders
    : filter === 'ongoing' ? orders.filter(o => ['Pending', 'InProgress', 'Ready', 'OutForDelivery'].includes(o.status))
    : orders.filter(o => o.status === filter);

  if (loading) {
    return (
      <>
        <CustomerHeader />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <CustomerHeader />
      <div className="min-h-screen bg-background pb-24 md:pb-8">
        <main className="pt-12 pb-20 px-6 max-w-7xl mx-auto">

          {/* Header */}
          <header className="mb-12">
            <h1 className="font-headline text-5xl font-extrabold text-on-surface tracking-tight mb-2">
              Order History
            </h1>
            <p className="text-on-surface-variant font-medium">{orders.length} orders total</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Sidebar */}
            <aside className="lg:col-span-3 space-y-8">
              <div className="bg-surface-container-low p-8 rounded-xl">
                <h3 className="font-headline font-bold text-lg mb-6">Refine View</h3>
                <div className="space-y-4">
                  {filterOptions.map(({ key, label, count }) => (
                    <button
                      key={key}
                      onClick={() => setFilter(key)}
                      className={`w-full flex items-center justify-between cursor-pointer px-2 py-1 rounded-lg transition-colors ${filter === key ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
                    >
                      <span className="font-medium">{label}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        key === 'ongoing' ? 'bg-tertiary-container text-on-tertiary-container'
                        : 'bg-surface-container-highest text-on-surface-variant'
                      }`}>{count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Decorative image panel */}
              <div className="relative rounded-xl overflow-hidden aspect-[4/5] shadow-card group hidden lg:block">
                <img
                  src="/images/wheat.jpg"
                  alt="Fresh ground flour"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                  <span className="text-primary-fixed-dim text-xs font-bold tracking-widest uppercase mb-2">Mill Fresh</span>
                  <h4 className="text-white font-headline font-bold text-xl leading-tight">Artisanal Grinding Since 1990</h4>
                </div>
              </div>
            </aside>

            {/* Orders List */}
            <div className="lg:col-span-9 space-y-6">
              {filtered.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-xl shadow-card p-16 text-center">
                  <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-4 block">receipt_long</span>
                  <h2 className="font-headline text-xl font-bold text-on-surface mb-2">No Orders Found</h2>
                  <p className="text-on-surface-variant mb-8">
                    {filter === 'All' ? "You haven't placed any orders yet." : 'No orders in this category.'}
                  </p>
                  <button
                    onClick={() => navigate('/order/products')}
                    className="sage-gradient text-on-primary font-headline font-bold px-8 py-4 rounded-full shadow-sage hover:shadow-sage-lg active:scale-95 transition-all"
                  >
                    Place an Order
                  </button>
                </div>
              ) : (
                filtered.map(order => (
                  <OrderCard
                    key={order._id}
                    order={order}
                    onReorder={handleReorder}
                    onCancel={handleCancel}
                    isCancelling={cancellingId === order._id}
                  />
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default OrderHistoryPage;
