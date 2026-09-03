import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CartContext } from '../../context/CartContext';
import { createOrder } from '../../api/orderApi';
import CustomerHeader from '../../components/common/CustomerHeader';

const ReviewPage = () => {
  const navigate = useNavigate();
  const { items, totalAmount, isEmpty, clearCart } = useContext(CartContext);
  const [deliveryAddress, setDeliveryAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [estimatedReadyDate, setEstimatedReadyDate] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('deliveryAddress');
    if (stored) {
      try { setDeliveryAddress(JSON.parse(stored)); }
      catch { toast.error('Failed to load address'); navigate('/order/address'); }
    } else {
      toast.error('No delivery address found');
      navigate('/order/address');
    }
  }, [navigate]);

  useEffect(() => {
    if (isEmpty()) { toast.error('Your cart is empty'); navigate('/order/products'); }
  }, [isEmpty, navigate]);

  useEffect(() => {
    const d = new Date();
    let added = 0;
    while (added < 2) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) added++; }
    setEstimatedReadyDate(d);
  }, []);

  const grindingTotal = items.reduce((s, i) => s + i.quantity * i.grindingCharge, 0);
  const rawMaterialTotal = items.reduce((s, i) => i.orderType === 'buyAndService' ? s + i.quantity * i.rawMaterialPrice : s, 0);

  const handleConfirmOrder = async () => {
    if (!deliveryAddress) { toast.error('Delivery address is missing'); return; }
    setLoading(true);
    try {
      const response = await createOrder({
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity, grindType: i.grindType, orderType: i.orderType })),
        deliveryAddress: {
          name: deliveryAddress.name, phone: deliveryAddress.phone,
          streetType: deliveryAddress.streetType, houseName: deliveryAddress.houseName,
          doorNo: deliveryAddress.doorNo, landmark: deliveryAddress.landmark || ''
        }
      });
      clearCart();
      localStorage.removeItem('deliveryAddress');
      toast.success('Order placed successfully!');
      navigate('/order/success', { state: { order: response.data } });
    } catch (err) {
      const errCode = err.response?.data?.error?.code;
      const errMsg  = err.response?.data?.error?.message;

      if (errCode === 'INSUFFICIENT_STOCK') {
        toast.error(`Out of stock — ${errMsg}`, { autoClose: 6000 });
      } else {
        toast.error(errMsg || 'Failed to place order. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!deliveryAddress) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <CustomerHeader />
      <div className="min-h-screen bg-background pb-32">
        <main className="max-w-2xl mx-auto px-6 md:px-8 py-12">

          {/* Progress */}
          <div className="flex items-center justify-center mb-12">
            <div className="flex items-center w-full max-w-lg">
              {[['1', 'Products', true], ['2', 'Address', true], ['3', 'Review', true]].map(([num, label, done], i, arr) => (
                <div key={num} className={`flex items-center ${i < arr.length - 1 ? 'flex-1' : ''}`}>
                  <div className="flex flex-col items-center">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-headline font-bold ${done ? 'sage-gradient text-on-primary shadow-sage' : 'bg-surface-container-highest text-on-surface opacity-40'}`}>{num}</div>
                    <span className={`mt-2 text-xs font-headline font-bold whitespace-nowrap ${done ? 'text-primary' : 'text-on-surface-variant opacity-40'}`}>{label}</span>
                  </div>
                  {i < arr.length - 1 && <div className={`h-1 flex-1 mx-3 rounded-full ${done ? 'bg-primary' : 'bg-surface-container-highest'}`} />}
                </div>
              ))}
            </div>
          </div>

          <header className="mb-10">
            <h1 className="font-headline text-4xl font-extrabold text-on-background tracking-tight mb-2">Review Order</h1>
            <p className="text-on-surface-variant">Review your order details before confirmation</p>
          </header>

          {/* Order Items */}
          <div className="bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/10 p-8 mb-5">
            <h2 className="font-headline font-bold text-lg text-on-surface mb-6">Order Items</h2>
            <div className="space-y-5">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between items-start pb-5 border-b border-surface-container-high last:border-0 last:pb-0">
                  <div className="flex-1">
                    <p className="font-headline font-bold text-on-surface">{item.productName}</p>
                    <p className="text-sm text-on-surface-variant mt-1">
                      {item.quantity} kg · {item.grindType} · {item.orderType === 'serviceOnly' ? 'Service Only' : 'Buy + Grinding'}
                    </p>
                  </div>
                  <p className="font-bold text-on-surface ml-4">₹{item.itemTotal.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/10 p-8 mb-5">
            <h2 className="font-headline font-bold text-lg text-on-surface mb-5">Price Breakdown</h2>
            <div className="space-y-3 text-sm">
              {rawMaterialTotal > 0 && (
                <div className="flex justify-between text-on-surface-variant">
                  <span>Raw Material Cost</span>
                  <span className="font-medium text-on-surface">₹{rawMaterialTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-on-surface-variant">
                <span>Grinding Charge</span>
                <span className="font-medium text-on-surface">₹{grindingTotal.toFixed(2)}</span>
              </div>
              <div className="pt-4 border-t border-outline-variant/10 flex justify-between items-center">
                <span className="font-headline font-bold text-on-surface text-base">Grand Total</span>
                <span className="font-headline font-extrabold text-2xl text-primary tracking-tight">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Estimated Ready Date */}
          <div className="bg-primary-container/40 rounded-xl p-6 mb-5 flex items-center gap-4">
            <div className="bg-primary-container p-3 rounded-xl">
              <span className="material-symbols-outlined text-primary">calendar_today</span>
            </div>
            <div>
              <p className="text-xs font-bold text-on-primary-container uppercase tracking-widest mb-1">Estimated Ready Date</p>
              <p className="font-headline font-bold text-on-background">
                {estimatedReadyDate?.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/10 p-8 mb-8">
            <h2 className="font-headline font-bold text-lg text-on-surface mb-4">Delivery Address</h2>
            <div className="text-on-surface-variant space-y-1 text-sm">
              <p className="font-bold text-on-surface">{deliveryAddress.name}</p>
              <p>{deliveryAddress.phone}</p>
              <p>{deliveryAddress.doorNo}, {deliveryAddress.houseName}</p>
              <p>{deliveryAddress.streetType}</p>
              {deliveryAddress.landmark && <p>Landmark: {deliveryAddress.landmark}</p>}
            </div>
          </div>
        </main>

        {/* Sticky Confirm Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-outline-variant/20 p-4 z-40">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleConfirmOrder}
              disabled={loading}
              className="w-full sage-gradient text-on-primary font-headline font-bold py-5 rounded-full shadow-sage hover:shadow-sage-lg active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-on-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  Confirm Order
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReviewPage;
