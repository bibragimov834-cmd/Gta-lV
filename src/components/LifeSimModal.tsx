import React, { useState } from 'react';
import {
  ArrowDownUp,
  Backpack,
  Building2,
  Car,
  Coffee,
  Globe,
  Landmark,
  Scissors,
  Shirt,
  Smartphone,
  User,
  X,
} from 'lucide-react';
import {
  CharacterAppearance,
  InventoryItem,
  SHOP_FOOD_MENU,
  TransactionRecord,
} from '../game/types';

export type LifeSimTab = 'phone' | 'character' | 'dining' | 'inventory' | 'bank';

interface LifeSimModalProps {
  initialTab?: LifeSimTab;
  cash: number;
  bankBalance: number;
  hunger: number;
  energy: number;
  appearance: CharacterAppearance;
  inventory: InventoryItem[];
  transactions: TransactionRecord[];
  onUpdateAppearance: (next: CharacterAppearance) => void;
  onBuyFood: (foodId: string) => void;
  onUseItem: (itemId: string) => void;
  onDeposit: (amount: number) => void;
  onWithdraw: (amount: number) => void;
  onQuickOpen: (target: 'garage' | 'dealership' | 'properties' | 'jobs' | 'multiplayer') => void;
  onClose: () => void;
}

const SKIN_TONES = ['#f5d0b5', '#e0ac8b', '#c68642', '#8d5524'];
const JACKET_COLORS = ['#2563eb', '#18181b', '#dc2626', '#059669', '#d97706', '#7c3aed', '#f4f4f5'];
const PANTS_COLORS = ['#1e293b', '#18181b', '#3f3f46', '#78350f', '#cbd5e1'];
const HAIR_COLORS = ['#18181b', '#451a03', '#b45309', '#e4e4e7', '#dc2626'];

export const LifeSimModal: React.FC<LifeSimModalProps> = ({
  initialTab = 'phone',
  cash,
  bankBalance,
  hunger,
  energy,
  appearance,
  inventory,
  transactions,
  onUpdateAppearance,
  onBuyFood,
  onUseItem,
  onDeposit,
  onWithdraw,
  onQuickOpen,
  onClose,
}) => {
  const [tab, setTab] = useState<LifeSimTab>(initialTab);
  const [amountInput, setAmountInput] = useState('1000');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-zinc-950/78">
      <div className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-display font-bold text-xl text-zinc-50">Horizon LifeOS &amp; City Hub</h2>
              <div className="text-xs text-zinc-400 flex flex-wrap gap-3">
                <span>Wallet: <strong className="text-emerald-400 font-mono-num">${cash.toLocaleString()}</strong></span>
                <span>Bank: <strong className="text-sky-400 font-mono-num">${bankBalance.toLocaleString()}</strong></span>
                <span>Hunger: <strong className="text-amber-400 font-mono-num">{hunger}%</strong></span>
                <span>Energy: <strong className="text-cyan-400 font-mono-num">{energy}%</strong></span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2.5 border-b border-zinc-800 flex flex-wrap gap-1.5">
          {(
            [
              { id: 'phone', label: 'Smartphone Apps', icon: <Smartphone className="w-3.5 h-3.5" /> },
              { id: 'character', label: 'Style & Barber', icon: <User className="w-3.5 h-3.5" /> },
              { id: 'dining', label: 'Restaurants & Shop', icon: <Coffee className="w-3.5 h-3.5" /> },
              { id: 'inventory', label: `Backpack (${inventory.length})`, icon: <Backpack className="w-3.5 h-3.5" /> },
              { id: 'bank', label: 'Bank & Ledger', icon: <Landmark className="w-3.5 h-3.5" /> },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                tab === item.id
                  ? 'bg-amber-500 text-zinc-950'
                  : 'bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {tab === 'phone' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { id: 'garage', title: '3D Garage & Tuning', sub: 'Modify & paint cars', icon: <Car className="w-6 h-6 text-amber-400" /> },
                { id: 'dealership', title: 'Car Dealership', sub: 'Buy, sell & compare', icon: <Car className="w-6 h-6 text-cyan-400" /> },
                { id: 'properties', title: 'Properties', sub: 'Villas, houses & rent', icon: <Building2 className="w-6 h-6 text-emerald-400" /> },
                { id: 'jobs', title: 'Jobs & Dispatch', sub: 'Taxi, courier, mechanic', icon: <ArrowDownUp className="w-6 h-6 text-purple-400" /> },
                { id: 'multiplayer', title: 'Multiplayer', sub: 'Car meets & drift rooms', icon: <Globe className="w-6 h-6 text-sky-400" /> },
              ].map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    onClose();
                    onQuickOpen(app.id as 'garage' | 'dealership' | 'properties' | 'jobs' | 'multiplayer');
                  }}
                  className="p-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/60 text-left space-y-1.5 cursor-pointer"
                >
                  {app.icon}
                  <div className="font-display font-bold text-sm text-zinc-100">{app.title}</div>
                  <div className="text-[11px] text-zinc-400">{app.sub}</div>
                </button>
              ))}
            </div>
          )}

          {tab === 'character' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                  <label className="text-xs font-medium text-zinc-300">Driver Display Name</label>
                  <input
                    type="text"
                    value={appearance.name}
                    onChange={(e) => onUpdateAppearance({ ...appearance, name: e.target.value.slice(0, 18) })}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-zinc-100"
                  />

                  <div className="text-xs text-zinc-400 pt-1">Skin Tone</div>
                  <div className="flex gap-2">
                    {SKIN_TONES.map((c) => (
                      <button
                        key={c}
                        onClick={() => onUpdateAppearance({ ...appearance, skinColor: c })}
                        className={`w-7 h-7 rounded-full border-2 cursor-pointer ${
                          appearance.skinColor === c ? 'border-amber-400 scale-110' : 'border-zinc-700'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2.5">
                  <div className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-amber-400" /> Hair Style &amp; Eyewear
                  </div>
                  <div className="flex gap-1.5">
                    {(['short', 'fade', 'cap'] as const).map((hs) => (
                      <button
                        key={hs}
                        onClick={() => onUpdateAppearance({ ...appearance, hairStyle: hs })}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer ${
                          appearance.hairStyle === hs
                            ? 'bg-amber-500 text-zinc-950 font-bold'
                            : 'bg-zinc-900 border border-zinc-700 text-zinc-300'
                        }`}
                      >
                        {hs}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 items-center justify-between pt-1">
                    <span className="text-xs text-zinc-400">Hair / Cap Color</span>
                    <div className="flex gap-1.5">
                      {HAIR_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => onUpdateAppearance({ ...appearance, hairColor: c })}
                          className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                            appearance.hairColor === c ? 'border-amber-400' : 'border-zinc-700'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center justify-between text-xs text-zinc-300 pt-1 cursor-pointer">
                    <span>Aviator Sunglasses</span>
                    <input
                      type="checkbox"
                      checked={appearance.glasses}
                      onChange={(e) => onUpdateAppearance({ ...appearance, glasses: e.target.checked })}
                      className="accent-amber-500"
                    />
                  </label>
                </div>
              </div>

              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2.5">
                <div className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Shirt className="w-3.5 h-3.5 text-amber-400" /> Atelier Clothing Wardrobe
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-zinc-400">Jacket Color</span>
                  <div className="flex gap-1.5">
                    {JACKET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => onUpdateAppearance({ ...appearance, jacketColor: c })}
                        className={`w-7 h-7 rounded-full border-2 cursor-pointer ${
                          appearance.jacketColor === c ? 'border-amber-400 scale-110' : 'border-zinc-700'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-zinc-400">Trousers Color</span>
                  <div className="flex gap-1.5">
                    {PANTS_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => onUpdateAppearance({ ...appearance, pantsColor: c })}
                        className={`w-7 h-7 rounded-full border-2 cursor-pointer ${
                          appearance.pantsColor === c ? 'border-amber-400 scale-110' : 'border-zinc-700'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'dining' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SHOP_FOOD_MENU.map((item) => (
                <div key={item.id} className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">{item.name}</div>
                    <div className="text-[11px] text-zinc-400">
                      {item.category === 'utility'
                        ? 'Restores 100% Vehicle Health & +35% Fuel'
                        : `+${item.hungerRestore}% Hunger · +${item.energyRestore}% Energy`}
                    </div>
                  </div>
                  <button
                    onClick={() => onBuyFood(item.id)}
                    disabled={cash < item.price}
                    className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 text-xs font-bold cursor-pointer shrink-0"
                  >
                    Buy ${item.price}
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'inventory' && (
            <div className="space-y-2.5">
              {inventory.length === 0 ? (
                <div className="text-xs text-zinc-500 text-center py-10">
                  Backpack is empty. Visit Restaurants &amp; Shops tab to stock up on espresso, meals, or repair kits.
                </div>
              ) : (
                inventory.map((inv) => (
                  <div key={inv.id} className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">
                        {inv.name} <span className="text-amber-400 font-mono-num">×{inv.qty}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 capitalize">{inv.category}</div>
                    </div>
                    <button
                      onClick={() => onUseItem(inv.id)}
                      className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold cursor-pointer"
                    >
                      Use / Consume
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'bank' && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={50}
                    step={100}
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-32 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm font-mono-num text-zinc-100"
                  />
                  <button
                    onClick={() => onDeposit(Number(amountInput) || 0)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold cursor-pointer"
                  >
                    Deposit to Bank
                  </button>
                  <button
                    onClick={() => onWithdraw(Number(amountInput) || 0)}
                    className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-bold cursor-pointer"
                  >
                    Withdraw Cash
                  </button>
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-1.5 max-h-[240px] overflow-y-auto">
                <div className="text-xs font-semibold text-zinc-400 pb-1">Recent Transactions</div>
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-xs py-1 border-b border-zinc-900">
                    <div>
                      <span className="text-zinc-200">{tx.label}</span>
                      <span className="text-[10px] text-zinc-500 ml-2">({tx.account.toUpperCase()} · {tx.timestamp})</span>
                    </div>
                    <span className={`font-mono-num font-semibold ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.amount >= 0 ? `+$${tx.amount.toLocaleString()}` : `-$${Math.abs(tx.amount).toLocaleString()}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
