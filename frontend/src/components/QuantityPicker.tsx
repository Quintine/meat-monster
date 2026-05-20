import { useState } from 'react';
import { Icons } from './Icons';

interface QuantityPickerProps {
    item: any;
    onConfirm: (item: any, qty: number) => void;
    onClose: () => void;
}

export default function QuantityPicker({ item, onConfirm, onClose }: QuantityPickerProps) {
    const remaining = item.remainingStock !== null && item.remainingStock !== undefined
        ? item.remainingStock
        : null;
    const max = remaining !== null ? remaining : 999;

    const [qty, setQty] = useState(1);

    const getPrice = (q: number) => {
        if (item.bulk2Threshold > 0 && q >= item.bulk2Threshold && item.bulk2Price > 0) return item.bulk2Price;
        if (item.bulk1Threshold > 0 && q >= item.bulk1Threshold && item.bulk1Price > 0) return item.bulk1Price;
        return item.price;
    };

    const unitPrice = getPrice(qty);
    const lineTotal = unitPrice * qty;

    const increment = () => setQty(q => Math.min(q + 1, max));
    const decrement = () => setQty(q => Math.max(q - 1, 1));

    const handleConfirm = () => {
        onConfirm(item, qty);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-[#131110] border border-stone-800 rounded-2xl w-full max-w-sm shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">

                {/* Header stripe */}
                <div className="h-1 bg-gradient-to-r from-red-800 via-red-600 to-red-800" />

                <div className="p-6">
                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-stone-500 hover:text-white transition-colors"
                    >
                        <Icons.X />
                    </button>

                    {/* Item info */}
                    <div className="mb-6">
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest border border-stone-800 px-2 py-1 rounded bg-stone-900">
                            {item.category}
                        </span>
                        <h3 className="text-2xl font-black text-white uppercase italic mt-2">{item.name}</h3>

                        {remaining !== null && (
                            <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-red-600 rounded-full transition-all"
                                        style={{ width: `${Math.max(5, (remaining / (item.maxStock || 1)) * 100)}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-stone-400 whitespace-nowrap">
                                    {remaining}{item.unit} left
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Quantity Selector */}
                    <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 mb-4">
                        <p className="text-xs text-stone-500 uppercase font-bold mb-3 tracking-widest">Select Quantity</p>
                        <div className="flex items-center justify-between gap-4">
                            <button
                                onClick={decrement}
                                disabled={qty <= 1}
                                className="w-12 h-12 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all active:scale-95"
                            >
                                <Icons.Minus />
                            </button>

                            <div className="text-center">
                                <input
                                    type="number"
                                    value={qty}
                                    min={1}
                                    max={max}
                                    onChange={(e) => {
                                        const v = parseInt(e.target.value) || 1;
                                        setQty(Math.min(Math.max(v, 1), max));
                                    }}
                                    className="w-20 text-center text-3xl font-black text-white bg-transparent border-b-2 border-red-600 outline-none pb-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <p className="text-xs text-stone-500 mt-1">{item.unit}</p>
                            </div>

                            <button
                                onClick={increment}
                                disabled={qty >= max}
                                className="w-12 h-12 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all active:scale-95"
                            >
                                <Icons.Plus />
                            </button>
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 mb-5 space-y-1.5">
                        <div className="flex justify-between text-sm">
                            <span className="text-stone-400">Unit price</span>
                            <span className="text-white font-bold">
                                ${unitPrice.toFixed(2)}/{item.unit}
                                {unitPrice < item.price && (
                                    <span className="text-green-500 text-xs ml-2">Bulk rate!</span>
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between border-t border-stone-800 pt-1.5">
                            <span className="text-stone-400 font-bold">Line total</span>
                            <span className="text-red-500 font-black text-lg">${lineTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Confirm */}
                    <button
                        onClick={handleConfirm}
                        className="w-full bg-red-700 hover:bg-red-600 active:scale-[0.98] text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-2"
                    >
                        <Icons.ShoppingCart />
                        Add {qty}{item.unit} to Order
                    </button>
                </div>
            </div>
        </div>
    );
}
