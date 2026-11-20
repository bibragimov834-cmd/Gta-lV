import React from 'react';
import { Building2, Car, DoorOpen, Home, MapPin, Palette, Sparkles, X } from 'lucide-react';
import {
  FurnitureTheme,
  OwnedPropertyState,
  PROPERTY_CATALOG,
  VEHICLE_CATALOG,
  VehicleId,
} from '../game/types';

interface PropertyModalProps {
  cash: number;
  bankBalance: number;
  ownedProperties: OwnedPropertyState[];
  ownedVehicles: VehicleId[];
  onBuyProperty: (id: string) => void;
  onSellProperty: (id: string) => void;
  onEnterProperty: (id: string, name: string) => void;
  onTeleportProperty: (x: number, z: number) => void;
  onUpdateDecor: (id: string, theme: FurnitureTheme, accentLight: string) => void;
  onParkVehicle: (id: string, vehicleId: VehicleId | null) => void;
  onClose: () => void;
}

const ACCENT_COLORS = ['#f59e0b', '#38bdf8', '#10b981', '#ec4899', '#ef4444'];

export const PropertyModal: React.FC<PropertyModalProps> = ({
  cash,
  bankBalance,
  ownedProperties,
  ownedVehicles,
  onBuyProperty,
  onSellProperty,
  onEnterProperty,
  onTeleportProperty,
  onUpdateDecor,
  onParkVehicle,
  onClose,
}) => {
  const totalFunds = cash + bankBalance;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-zinc-950/78">
      <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-display font-bold text-xl text-zinc-50">Horizon Real Estate &amp; Residences</h2>
              <div className="text-xs text-zinc-400">
                Available Funds: <span className="text-emerald-400 font-mono-num">${totalFunds.toLocaleString()}</span> ·
                Owned Properties: <span className="text-amber-400 font-mono-num">{ownedProperties.length}</span>
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

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
          {PROPERTY_CATALOG.map((prop) => {
            const owned = ownedProperties.find((o) => o.id === prop.id);
            const canAfford = totalFunds >= prop.price;

            return (
              <div
                key={prop.id}
                className={`p-4 rounded-xl border space-y-3 ${
                  owned ? 'bg-amber-500/8 border-amber-500/70' : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-medium text-amber-400 flex items-center gap-1">
                      <Home className="w-3 h-3" /> {prop.category} · {prop.district}
                    </div>
                    <h3 className="font-display font-bold text-lg text-zinc-50 mt-0.5">{prop.name}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono-num font-bold text-emerald-400">
                      ${prop.price.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      +${prop.dailyIncome}/day · {prop.garageSlots}-Car Bay
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">{prop.description}</p>

                {owned ? (
                  <div className="space-y-2.5 pt-2 border-t border-zinc-800/80">
                    {/* Interior Customization */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-zinc-300 flex items-center gap-1">
                        <Palette className="w-3.5 h-3.5 text-amber-400" /> Interior Theme:
                      </span>
                      <div className="flex gap-1">
                        {(
                          [
                            { id: 'modern-dark', label: 'Modern' },
                            { id: 'warm-oak', label: 'Oak' },
                            { id: 'minimal-white', label: 'Minimal' },
                          ] as const
                        ).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => onUpdateDecor(prop.id, t.id, owned.accentLight)}
                            className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer ${
                              owned.furnitureTheme === t.id
                                ? 'bg-amber-500 text-zinc-950'
                                : 'bg-zinc-900 border border-zinc-700 text-zinc-300'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-zinc-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Accent Lighting:
                      </span>
                      <div className="flex gap-1.5">
                        {ACCENT_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => onUpdateDecor(prop.id, owned.furnitureTheme, c)}
                            className={`w-5 h-5 rounded-full border-2 cursor-pointer ${
                              owned.accentLight === c ? 'border-white scale-110' : 'border-zinc-700'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-zinc-300 flex items-center gap-1">
                        <Car className="w-3.5 h-3.5 text-amber-400" /> Indoor Garage Bay:
                      </span>
                      <select
                        value={owned.parkedVehicleId || ''}
                        onChange={(e) =>
                          onParkVehicle(prop.id, (e.target.value || null) as VehicleId | null)
                        }
                        className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-[11px] text-zinc-100"
                      >
                        <option value="">Empty Bay</option>
                        {ownedVehicles.map((vid) => {
                          const spec = VEHICLE_CATALOG.find((v) => v.id === vid);
                          return (
                            <option key={vid} value={vid}>
                              {spec ? `${spec.brand} ${spec.model}` : vid}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          onEnterProperty(prop.id, prop.name);
                          onClose();
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer"
                      >
                        <DoorOpen className="w-3.5 h-3.5" />
                        <span>Enter 3D Interior</span>
                      </button>
                      <button
                        onClick={() => {
                          onTeleportProperty(prop.x, prop.z + 20);
                          onClose();
                        }}
                        className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                        <span>Visit</span>
                      </button>
                      <button
                        onClick={() => onSellProperty(prop.id)}
                        className="px-3 py-2 rounded-lg bg-red-950/70 hover:bg-red-900/70 border border-red-700/50 text-red-200 text-xs font-medium cursor-pointer"
                      >
                        Sell
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => onBuyProperty(prop.id)}
                      disabled={!canAfford}
                      className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold text-xs cursor-pointer"
                    >
                      {canAfford ? `Buy Property ($${prop.price.toLocaleString()})` : 'Insufficient Funds'}
                    </button>
                    <button
                      onClick={() => {
                        onTeleportProperty(prop.x, prop.z + 20);
                        onClose();
                      }}
                      className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium cursor-pointer"
                    >
                      Tour Outside
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
