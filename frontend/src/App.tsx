import React, { useState, useEffect } from 'react';
import { API } from './services/api';
import { Icons } from './components/Icons';
import CustomerView from './components/CustomerView';
import AdminDashboard from './components/AdminDashboard';
import CartModal from './components/CartModal';

function App() {
  const [view, setView] = useState<'customer' | 'admin'>('customer');
  const [stock, setStock] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [adminCode, setAdminCode] = useState('1234');
  const [config, setConfig] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean, message: string, onConfirm: (() => void) | null }>({ show: false, message: '', onConfirm: null });

  useEffect(() => {
    refreshData();
    const intervalId = setInterval(refreshData, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const refreshData = async () => {
    try {
      const data = await API.fetchData();
      setStock(data.stock);
      setOrders(data.orders.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      if (data.config) {
        setAdminCode(data.config.adminCode || '1234');
        setConfig(data.config);
      }
      setIsLoading(false);
    } catch (err) {
      console.error("Server connection failed.", err);
    }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const promptConfirm = (message: string, action: () => void) => {
    setConfirmModal({
      show: true,
      message,
      onConfirm: async () => {
        await action();
        setConfirmModal({ show: false, message: '', onConfirm: null });
      }
    });
  };

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
    showNotification(`Added 1${item.unit} ${item.name}`);
  };

  const updateCartQty = (itemId: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === itemId) {
        const newQty = i.qty + delta;
        return newQty > 0 ? { ...i, qty: newQty } : i;
      }
      return i;
    }));
  };

  const removeFromCart = (itemId: number) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const submitOrder = async (name: string, phone: string) => {
    const getPrice = (item: any, qty: number) => {
      if (item.bulk2Threshold > 0 && qty >= item.bulk2Threshold && item.bulk2Price > 0) return item.bulk2Price;
      if (item.bulk1Threshold > 0 && qty >= item.bulk1Threshold && item.bulk1Price > 0) return item.bulk1Price;
      return item.price;
    };

    const itemsWithFinalPrice = cart.map(i => ({
      ...i,
      finalPricePerUnit: getPrice(i, i.qty),
      lineTotal: getPrice(i, i.qty) * i.qty
    }));

    const orderData = {
      name,
      phone,
      items: itemsWithFinalPrice,
      totalWeight: cart.reduce((acc, i) => acc + i.qty, 0),
      estimatedTotal: itemsWithFinalPrice.reduce((acc, i) => acc + i.lineTotal, 0)
    };

    try {
      const order = await API.submitOrder(orderData);
      setCart([]);
      refreshData();
      showNotification("Order Request Sent!");
      return order;
    } catch (error) {
      showNotification("Error submitting order.");
      throw error;
    }
  };

  const handleAdminLogin = () => {
    if (adminCodeInput === adminCode) {
      setView('admin');
      setShowAdminLogin(false);
      setAdminCodeInput('');
      showNotification("Logged in as Admin");
    } else {
      showNotification("Incorrect Admin Code");
    }
  };

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-stone-900 text-red-600 font-bold text-2xl tracking-widest uppercase animate-pulse">Loading Meat Monster...</div>;

  return (
    <div className="min-h-screen monster-bg pb-20 text-stone-200">
      <header className="bg-stone-950 border-b border-red-900 sticky top-0 z-40 shadow-2xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('customer')}>
            <div className="text-red-600"><Icons.Beast /></div>
            <div>
              <h1 className="text-3xl font-black text-red-600 leading-none tracking-tighter text-glow italic">MEAT MONSTER</h1>
              <p className="text-xs text-stone-500 tracking-[0.2em] font-bold uppercase">Bulk & Wholesale</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {view === 'customer' && (
              <button onClick={() => setShowCartModal(true)} className="relative p-2 text-stone-400 hover:text-red-500 transition-colors">
                <Icons.ShoppingCart />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                    {cart.reduce((acc, i) => acc + i.qty, 0)}
                  </span>
                )}
              </button>
            )}
            <button onClick={() => { if (view === 'admin') setView('customer'); else setShowAdminLogin(true); }} className={`p-2 rounded-md transition-colors ${view === 'admin' ? 'bg-red-900/50 text-red-200' : 'text-stone-600 hover:text-stone-400'}`}>
              {view === 'admin' ? <Icons.X /> : <Icons.Lock />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {notification && <div className="fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-2xl animate-bounce z-50 font-bold tracking-wide border border-red-400">{notification}</div>}
        {view === 'customer' ? <CustomerView stock={stock} addToCart={addToCart} config={config} /> : <AdminDashboard stock={stock} orders={orders} refreshData={refreshData} notify={showNotification} promptConfirm={promptConfirm} />}
      </main>

      {showCartModal && <CartModal cart={cart} config={config} onClose={() => setShowCartModal(false)} onRemove={removeFromCart} onUpdateQty={updateCartQty} onSubmit={submitOrder} />}

      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-stone-950 border border-red-900 w-full max-w-xs p-6 rounded-xl shadow-2xl flex flex-col gap-4">
            <div className="text-center">
              <div className="text-red-600 mx-auto w-10 h-10 mb-2"><Icons.Lock /></div>
              <h3 className="text-xl font-bold text-white uppercase">Admin Access</h3>
            </div>
            <input type="password" placeholder="Enter Code" autoFocus className="bg-stone-900 border border-stone-700 rounded-lg p-3 text-center text-white tracking-widest focus:border-red-600 outline-none" value={adminCodeInput} onChange={(e) => setAdminCodeInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()} />
            <div className="flex gap-2">
              <button onClick={() => { setShowAdminLogin(false); setAdminCodeInput(''); }} className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-400 font-bold py-3 rounded-lg">Cancel</button>
              <button onClick={handleAdminLogin} className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded-lg">Login</button>
            </div>
          </div>
        </div>
      )}

      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-stone-950 border border-stone-700 w-full max-w-sm p-6 rounded-xl shadow-2xl text-center">
            <div className="text-red-500 mx-auto w-10 h-10 mb-4"><Icons.Alert /></div>
            <h3 className="text-lg font-bold text-white mb-6">{confirmModal.message}</h3>
            <div className="flex gap-2">
              <button onClick={() => setConfirmModal({ show: false, message: '', onConfirm: null })} className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-400 font-bold py-3 rounded-lg">Cancel</button>
              <button onClick={() => confirmModal.onConfirm?.()} className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded-lg">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
