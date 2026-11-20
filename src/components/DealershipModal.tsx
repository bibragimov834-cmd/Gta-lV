import React, { useState } from 'react';
import { ArrowLeftRight, Car, Check, DollarSign, Play, Wrench, X } from 'lucide-react';
import { VEHICLE_CATALOG, VehicleId } from '../game/types';

interface DealershipModalProps {
  cash: number;
  bankBalance: number;
  ownedVehicles: VehicleId[];
  activeVehicleId: VehicleId | null;
  initialMarket?: 'new' | 'used';
  onBuyVehicle: (id: VehicleId, used: boolean) => void;
  onSellVehicle: (id: VehicleId) => void;
  onTestDrive: (id: VehicleId) => void;
  onOpenGarage: () => void;
  onRepairActive: () => void;
  onClose: () => void;
}

export const DealershipModal: React.FC<DealershipModalProps> = ({
  cash,
  bankBalance,
  ownedVehicles,
  initialMarket = 'new',
  onBuyVehicle,
  onSellVehicle,
  onTestDrive,
  onOpenGarage,
  onRepairActive,
  onClose,
}) => {
  const [marketTab, setMarketTab] = useState<'new' | 'used' | 'compare'>(initialMarket);
  const [compareA, setCompareA] = useState<VehicleId>('bmw_m4');
  const [compareB, setCompareB] = useState<VehicleId>('e63_amg');

  const totalFunds = cash + bankBalance;
  const specA = VEHICLE_CATALOG.find((v) => v.id === compareA) || VEHICLE_CATALOG[0];
  const specB = VEHICLE_CATALOG.find((v) => v.id === compareB) || VEHICLE_CATALOG[4];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-zinc-950/78">
      <div className="w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Car className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-display font-bold text-xl text-zinc-50">Horizon Auto Dealership &amp; Market</h2>
              <div className="text-xs text-zinc-400">
                Available Funds: <span className="text-emerald-400 font-mono-num">${totalFunds.toLocaleString()}</span> ·
                Garage Fleet: <span className="text-amber-400 font-mono-num">{ownedVehicles.length}/7</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRepairActive}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-100 cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span>Repair Active ($250)</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenGarage();
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold cursor-pointer"
            >
              Tuning Showroom
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Market Tabs */}
        <div className="px-6 pt-3 flex gap-2 border-b border-zinc-800 pb-3">
          {(
            [
              { id: 'new', label: 'New Car Dealership' },
              { id: 'used', label: 'Certified Used Market' },
              { id: 'compare', label: 'Compare 2 Vehicles' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setMarketTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                marketTab === t.id
                  ? 'bg-amber-500 text-zinc-950'
                  : 'bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto">
          {marketTab === 'compare' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { val: compareA, set: setCompareA, label: 'Vehicle A' },
                  { val: compareB, set: setCompareB, label: 'Vehicle B' },
                ].map((sel) => (
                  <div key={sel.label} className="space-y-1">
                    <label className="text-xs text-zinc-400">{sel.label}</label>
                    <select
                      value={sel.val}
                      onChange={(e) => sel.set(e.target.value as VehicleId)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm text-zinc-100"
                    >
                      {VEHICLE_CATALOG.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.brand} {v.model}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl divide-y divide-zinc-800 text-xs">
                {[
                  { label: 'Category', a: specA.category, b: specB.category },
                  { label: 'Showroom Price', a: `$${specA.price.toLocaleString()}`, b: `$${specB.price.toLocaleString()}` },
                  { label: 'Horsepower', a: `${specA.horsepower} HP`, b: `${specB.horsepower} HP` },
                  { label: 'Top Speed', a: `${specA.topSpeedKmh} km/h`, b: `${specB.topSpeedKmh} km/h` },
                  { label: '0-100 km/h', a: specA.zeroToHundred, b: specB.zeroToHundred },
                  { label: 'Drivetrain', a: specA.drivetrain, b: specB.drivetrain },
                  { label: 'Curb Weight', a: `${specA.mass} kg`, b: `${specB.mass} kg` },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-3 px-4 py-2.5">
                    <span className="text-zinc-400">{row.label}</span>
                    <span className="font-mono-num text-zinc-100 font-semibold">{row.a}</span>
                    <span className="font-mono-num text-amber-400 font-semibold">{row.b}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {VEHICLE_CATALOG.map((car) => {
                const owned = ownedVehicles.includes(car.id);
                const price = marketTab === 'used' ? car.usedPrice : car.price;
                const canAfford = totalFunds >= price;
                const tradeIn = Math.round(car.usedPrice * 0.88);

                return (
                  <div
                    key={car.id}
                    className={`p-4 rounded-xl border space-y-3 ${
                      owned ? 'bg-amber-500/8 border-amber-500/60' : 'bg-zinc-950 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] text-amber-400 font-medium">{car.brand} · {car.category}</div>
                        <h3 className="font-display font-bold text-lg text-zinc-50">{car.model}</h3>
                      </div>
                      <span
                        className="w-5 h-5 rounded-full border border-zinc-600 shrink-0 mt-1"
                        style={{ backgroundColor: car.defaultColor }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-[11px] bg-zinc-900 rounded-lg p-2 font-mono-num">
                      <div>
                        <div className="text-zinc-500">POWER</div>
                        <div className="text-zinc-100 font-semibold">{car.horsepower} HP</div>
                      </div>
                      <div>
                        <div className="text-zinc-500">0-100</div>
                        <div className="text-zinc-100 font-semibold">{car.zeroToHundred}</div>
                      </div>
                      <div>
                        <div className="text-zinc-500">TOP</div>
                        <div className="text-zinc-100 font-semibold">{car.topSpeedKmh} km/h</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">
                        {marketTab === 'used' ? 'Used Price:' : 'MSRP Price:'}
                      </span>
                      <span className="font-mono-num font-bold text-emerald-400 text-sm">
                        ${price.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex gap-1.5">
                      {owned ? (
                        <>
                          <div className="flex-1 py-2 px-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Owned
                          </div>
                          {ownedVehicles.length > 1 && (
                            <button
                              onClick={() => onSellVehicle(car.id)}
                              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                              <span>Sell ${tradeIn.toLocaleString()}</span>
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => onBuyVehicle(car.id, marketTab === 'used')}
                          disabled={!canAfford}
                          className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold text-xs cursor-pointer"
                        >
                          {canAfford ? 'Purchase' : 'Need Funds'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onTestDrive(car.id);
                          onClose();
                        }}
                        className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1 cursor-pointer"
                        title="Deliver & Drive"
                      >
                        <Play className="w-3 h-3" />
                        <span>Drive</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
