import { useState } from 'react';
import { Icons } from './Icons';

interface CartItem {
    id: number;
    name: string;
    qty: number;
    price: number;
    unit: string;
    bulk1Threshold: number;
    bulk1Price: number;
    bulk2Threshold: number;
    bulk2Price: number;
}

export default function CartModal({ cart, onClose, onRemove, onUpdateQty, onSubmit, config }: { cart: CartItem[], onClose: () => void, onRemove: (id: number) => void, onUpdateQty: (id: number, delta: number) => void, onSubmit: (name: string, phone: string) => Promise<any>, config?: any }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedOrder, setSubmittedOrder] = useState<any>(null);

    const getPrice = (item: CartItem, qty: number) => {
        if (item.bulk2Threshold > 0 && qty >= item.bulk2Threshold && item.bulk2Price > 0) return item.bulk2Price;
        if (item.bulk1Threshold > 0 && qty >= item.bulk1Threshold && item.bulk1Price > 0) return item.bulk1Price;
        return item.price;
    };

    const total = cart.reduce((acc, item) => {
        const price = getPrice(item, item.qty);
        return acc + (price * item.qty);
    }, 0);

    const totalWeight = cart.reduce((acc, i) => acc + i.qty, 0);
    const depositAmount = total * 0.3;

    const handleSubmit = async () => {
        if (!name || !phone) return;
        setIsSubmitting(true);
        try {
            const order = await onSubmit(name, phone);
            setSubmittedOrder(order);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submittedOrder) {
        return (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 z-50">
                <div className="bg-[#1c1917] border border-stone-700 w-full max-w-md rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.2)] overflow-hidden flex flex-col">
                    <div className="p-8 text-center space-y-6">
                        <div className="bg-green-900/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto border border-green-500/50 text-green-500 text-4xl animate-bounce">
                            <Icons.Check />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black italic text-white uppercase mb-2">Order Received!</h2>
                            <p className="text-stone-400 font-mono tracking-tighter text-lg font-bold">ID: {submittedOrder.orderNumber}</p>
                        </div>

                        <div className="bg-stone-950 p-6 rounded-xl border border-stone-800 space-y-4 text-left">
                            <h3 className="text-red-500 font-black uppercase text-xs tracking-widest border-b border-stone-800 pb-2">Payment Instructions</h3>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="text-stone-500 mt-1"><Icons.Alert /></div>
                                    <p className="text-sm text-stone-300">A <span className="text-white font-bold">30% deposit of ${depositAmount.toFixed(2)}</span> is required before we start the smoker.</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-stone-500 uppercase">Option 1: PayID (Instant)</p>
                                    <div className="bg-stone-900 p-3 rounded border border-red-900/30 text-white font-mono flex justify-between items-center group">
                                        <span>{config?.payIdInfo || '0400 000 000'}</span>
                                        <span className="text-[8px] uppercase bg-red-900/50 px-1 rounded text-red-400">Copy</span>
                                    </div>
                                    <p className="text-[10px] text-stone-500 italic">Please use "{submittedOrder.orderNumber}" as the payment description.</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-stone-500 uppercase">Option 2: Cash Deposit</p>
                                    <p className="text-sm text-stone-300">Contact us via the phone number provided to arrange a cash drop-off.</p>
                                </div>
                            </div>
                        </div>

                        <button onClick={onClose} className="w-full bg-stone-800 hover:bg-stone-700 text-white font-black uppercase py-4 rounded-xl transition-all">Close</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#1c1917] border border-stone-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-stone-800 flex justify-between items-center bg-[#0c0a09]">
                    <h2 className="text-xl font-black italic text-white flex items-center gap-2 text-glow uppercase"><Icons.Beast /> Your Order</h2>
                    <button onClick={onClose} className="text-stone-500 hover:text-white"><Icons.X /></button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="text-center py-10 text-stone-500">
                            <p>Feed the beast. Add some meat.</p>
                            <button onClick={onClose} className="mt-4 text-red-500 font-bold hover:underline">Back to Menu</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {cart.map(item => {
                                const currentPrice = getPrice(item, item.qty);
                                const isTier2 = item.bulk2Threshold > 0 && item.qty >= item.bulk2Threshold;
                                const isTier1 = !isTier2 && item.bulk1Threshold > 0 && item.qty >= item.bulk1Threshold;
                                
                                let nextTierMsg = null;
                                if (!isTier2 && item.bulk2Threshold > 0) {
                                    const diff = item.bulk2Threshold - item.qty;
                                    if (diff > 0) nextTierMsg = `Add ${diff}${item.unit} for Tier 2 ($${item.bulk2Price})`;
                                } 
                                if (!isTier1 && !isTier2 && item.bulk1Threshold > 0 && (!nextTierMsg || (item.bulk1Threshold - item.qty) < (item.bulk2Threshold - item.qty))) {
                                     const diff = item.bulk1Threshold - item.qty;
                                     if (diff > 0) nextTierMsg = `Add ${diff}${item.unit} for Tier 1 ($${item.bulk1Price})`;
                                }

                                return (
                                    <div key={item.id} className="flex flex-col gap-2 pb-4 border-b border-stone-800 last:border-0">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <h4 className="font-bold text-stone-200 text-lg">{item.name}</h4>
                                                <div className="text-sm">
                                                    <span className={(isTier1 || isTier2) ? "text-green-500 font-bold" : "text-stone-500"}>
                                                        ${currentPrice}/{item.unit}
                                                    </span>
                                                    {(isTier1 || isTier2) && <span className="text-xs text-stone-500 line-through ml-2">${item.price}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center bg-stone-950 rounded-lg border border-stone-800">
                                                <button onClick={() => onUpdateQty(item.id, -1)} className="p-3 text-stone-400 hover:text-white"><Icons.Minus /></button>
                                                <span className="w-12 text-center font-mono text-white font-bold">{item.qty}{item.unit}</span>
                                                <button onClick={() => onUpdateQty(item.id, 1)} className="p-3 text-stone-400 hover:text-white"><Icons.Plus /></button>
                                            </div>
                                            <button onClick={() => onRemove(item.id)} className="text-stone-600 hover:text-red-500 p-2"><Icons.Trash /></button>
                                        </div>
                                        {nextTierMsg && (
                                             <div className="text-xs text-stone-500 bg-stone-900 py-1 px-2 rounded flex justify-between items-center">
                                                <span>{nextTierMsg}</span>
                                                <Icons.Scale />
                                             </div>
                                        )}
                                        {isTier1 && !isTier2 && <div className="text-xs text-yellow-500 font-bold flex items-center gap-1"><Icons.Check /> Tier 1 Applied!</div>}
                                        {isTier2 && <div className="text-xs text-green-500 font-bold flex items-center gap-1"><Icons.Check /> Tier 2 Super Bulk Applied!</div>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {cart.length > 0 && (
                    <div className="p-6 bg-[#0c0a09] border-t border-stone-800">
                        <div className="space-y-2 mb-6">
                            <div className="flex justify-between text-stone-400 font-bold">
                                <span>Total Est. ({totalWeight}kg)</span>
                                <span>${total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-red-500 text-2xl font-black italic uppercase tracking-tighter">
                                <span>30% Deposit Due</span>
                                <span>${depositAmount.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="text-xs bg-stone-950 p-3 rounded border border-stone-800 text-stone-400">
                                <p className="font-bold text-red-500 mb-1 uppercase tracking-widest">Deposit Required</p>
                                <p>Order will not be cooked until the 30% deposit is paid. We accept PayID and Cash.</p>
                                {(config?.maxTotalWeight || config?.maxItemWeight) && (
                                    <p className="mt-2 border-t border-stone-850 pt-2 text-[10px] text-stone-500 italic">
                                        Limits: Max {config.maxTotalWeight ?? 100}kg total weight | Max {config.maxItemWeight ?? 50}kg per item.
                                    </p>
                                )}
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Name</label>
                                    <input type="text" required placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-stone-900 border border-stone-700 rounded-lg p-4 text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Phone Number</label>
                                    <input type="tel" required placeholder="0400 000 000" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-stone-900 border border-stone-700 rounded-lg p-4 text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all" />
                                </div>
                            </div>
                            <button 
                                onClick={handleSubmit} 
                                disabled={!name || !phone || isSubmitting} 
                                className="w-full bg-red-700 hover:bg-red-600 disabled:bg-stone-800 disabled:text-stone-600 text-white font-black uppercase tracking-widest py-4 rounded-lg transition-all shadow-lg shadow-red-900/20 active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? 'Sending Request...' : 'Submit Order'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
