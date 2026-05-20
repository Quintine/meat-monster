import React from 'react';
import { Icons } from './Icons';

interface StockItem {
    id: number;
    name: string;
    category: string;
    price: number;
    unit: string;
    available: boolean;
    description: string;
    bulk1Threshold: number;
    bulk1Price: number;
    bulk2Threshold: number;
    bulk2Price: number;
}

function StockCard({ item, onAdd, disabled }: { item: StockItem, onAdd?: () => void, disabled?: boolean }) {
    const hasTier1 = item.bulk1Threshold > 0 && item.bulk1Price > 0;
    const hasTier2 = item.bulk2Threshold > 0 && item.bulk2Price > 0;
    
    return (
        <div className="bg-[#131110] border border-stone-800 rounded-xl overflow-hidden hover:border-red-900/50 transition-all group flex flex-col shadow-lg hover:shadow-red-900/10">
            <div className="p-6 flex-1 relative">
                <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-[0.15em] border border-stone-800 px-2 py-1 rounded bg-stone-900">{item.category}</span>
                </div>
                
                <h4 className="text-2xl font-black text-stone-100 mb-1 uppercase italic">{item.name}</h4>
                <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-xl font-bold text-red-500">${item.price}</span>
                    <span className="text-sm text-stone-500 font-bold">/ {item.unit}</span>
                </div>

                <div className="space-y-1 mb-4">
                    {hasTier1 && (
                        <div className="text-xs font-bold text-stone-400 bg-stone-900/50 border border-stone-800 px-2 py-1 rounded inline-block mr-2">
                            Buy {item.bulk1Threshold}{item.unit}+: <span className="text-green-500">${item.bulk1Price}</span>
                        </div>
                    )}
                    {hasTier2 && (
                        <div className="text-xs font-bold text-stone-400 bg-stone-900/50 border border-stone-800 px-2 py-1 rounded inline-block">
                            Buy {item.bulk2Threshold}{item.unit}+: <span className="text-green-400">${item.bulk2Price}</span>
                        </div>
                    )}
                </div>
                
                <p className="text-stone-400 text-sm leading-relaxed">{item.description}</p>
            </div>
            
            <div className="p-4 bg-stone-950 border-t border-stone-800">
                <button 
                    onClick={onAdd}
                    disabled={disabled}
                    className={`w-full py-3 rounded-lg font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 ${
                        disabled 
                        ? 'bg-stone-900 text-stone-700 cursor-not-allowed border border-stone-800' 
                        : 'bg-red-700 hover:bg-red-600 text-white shadow-lg shadow-red-900/30'
                    }`}
                >
                    {disabled ? 'Sold Out' : <><Icons.Plus /> Add to Order</>}
                </button>
            </div>
        </div>
    );
}

export default function CustomerView({ stock, addToCart, config }: { stock: StockItem[], addToCart: (item: StockItem) => void, config?: any }) {
    const availableStock = stock.filter(item => item.available);
    const soldOutStock = stock.filter(item => !item.available);

    const formatDate = (d: string) => {
        if (!d) return 'TBA';
        try {
            return new Date(d).toLocaleString('en-AU', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) { return d; }
    };

    return (
        <div className="space-y-8">
            <div className="text-center space-y-6 py-10 bg-gradient-to-b from-stone-900/0 to-stone-900/20 rounded-3xl border border-stone-800/50">
                <h2 className="text-5xl md:text-6xl font-black text-white uppercase italic tracking-tight">Feed the <span className="text-red-600">Beast</span></h2>
                <p className="text-stone-400 max-w-2xl mx-auto text-lg font-light">
                    Premium smoked meats by the Kilogram. <br/>
                    <span className="text-red-400 font-bold">Bulk discounts</span> applied automatically at checkout.
                </p>
            </div>

            <div className="bg-red-900/10 border border-red-900/40 p-6 rounded-xl flex items-start gap-4 max-w-4xl mx-auto shadow-[0_0_25px_rgba(220,38,38,0.1)] relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                <div className="text-red-500 mt-1 flex-shrink-0 text-2xl"><Icons.Alert /></div>
                <div className="space-y-4">
                    <div>
                        <p className="text-red-500 font-black uppercase tracking-widest text-sm mb-2 flex items-center gap-2">
                            Terms of Service & Ordering Policy
                        </p>
                        <p className="text-stone-300 text-sm leading-relaxed">
                            To secure your order, a <span className="text-white font-bold underline">30% non-refundable deposit</span> is required upfront before smoking begins. 
                            Payments can be made via <span className="text-red-400 font-bold">PayID</span> or <span className="text-red-400 font-bold">Cash</span>.
                            The remaining balance is payable upon pickup or delivery.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="bg-stone-950/50 border border-stone-800 p-3 rounded-lg">
                            <p className="text-[10px] text-stone-500 uppercase font-black mb-1">Final Deposit Deadline</p>
                            <p className="text-white font-mono font-bold">{config?.finalDepositDate ? formatDate(config.finalDepositDate) : 'TBA'}</p>
                        </div>
                        <div className="bg-stone-950/50 border border-stone-800 p-3 rounded-lg">
                            <p className="text-[10px] text-stone-500 uppercase font-black mb-1">Scheduled Cook Day</p>
                            <p className="text-red-500 font-mono font-bold uppercase tracking-tighter text-lg">{config?.cookDay ? new Date(config.cookDay).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) : 'TBA'}</p>
                        </div>
                    </div>

                    <div className="text-[10px] text-stone-500 italic flex items-center gap-1">
                        <Icons.Check /> Deposits cover material costs and are final. PayID details provided after ordering.
                    </div>
                </div>
            </div>

            <div className="pt-4">
                <h3 className="text-2xl font-bold text-stone-300 mb-6 flex items-center gap-2"><Icons.Beast /> In The Smoker</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availableStock.map(item => (
                        <StockCard key={item.id} item={item} onAdd={() => addToCart(item)} />
                    ))}
                    {availableStock.length === 0 && <p className="text-stone-500 italic col-span-full text-center py-10 border border-dashed border-stone-800 rounded-xl">Nothing in the smoker right now.</p>}
                </div>
            </div>

            {soldOutStock.length > 0 && (
                <div className="opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                    <h3 className="text-2xl font-bold text-stone-600 mb-6 border-b border-stone-800 pb-2">Sold Out</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {soldOutStock.map(item => (
                            <StockCard key={item.id} item={item} disabled={true} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
