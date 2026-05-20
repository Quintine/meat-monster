import React, { useState } from 'react';
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

export default function CartModal({ cart, onClose, onRemove, onUpdateQty, onSubmit }: { cart: CartItem[], onClose: () => void, onRemove: (id: number) => void, onUpdateQty: (id: number, delta: number) => void, onSubmit: (name: string, phone: string) => void }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

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
                        <div className="flex justify-between mb-6 text-xl font-bold">
                            <span className="text-stone-400">Total Est. ({totalWeight}kg)</span>
                            <span className="text-red-500 text-2xl">${total.toFixed(2)}</span>
                        </div>
                        <div className="space-y-4">
                            <div className="text-xs bg-stone-950 p-3 rounded border border-stone-800 text-stone-400">
                                <p className="font-bold text-red-500 mb-1 uppercase">Payment Required</p>
                                <p>By submitting, you agree to pay upfront via cash. Delivery/Pickup will be negotiated upon confirmation.</p>
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
                            <button onClick={() => onSubmit(name, phone)} disabled={!name || !phone} className="w-full bg-red-700 hover:bg-red-600 disabled:bg-stone-800 disabled:text-stone-600 text-white font-black uppercase tracking-widest py-4 rounded-lg transition-all shadow-lg shadow-red-900/20 active:scale-[0.98]">Submit Order</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
