import { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { traccarCreateDevice } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useGPSStore, Vehicle } from '../lib/store';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddVehicleModal({ isOpen, onClose }: AddVehicleModalProps) {
  const [name, setName] = useState('');
  const [uniqueId, setUniqueId] = useState('');
  const [model, setModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const addVehicle = useGPSStore((state) => state.addVehicle);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Step 1: Create device in Traccar
      const traccarDevice = await traccarCreateDevice(name, uniqueId, model);
      console.log('[AddVehicle] Traccar device created:', traccarDevice);

      // Step 2: Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Step 3: Create vehicle record in Supabase
      const { data: supabaseVehicle, error: supabaseError } = await supabase
        .from('vehicles')
        .insert({
          user_id: user.id,
          traccar_device_id: traccarDevice.id,
          name: name,
          model: model || null,
          license_plate: licensePlate || null,
        })
        .select()
        .single();

      if (supabaseError) {
        throw new Error(`Supabase error: ${supabaseError.message}`);
      }

      console.log('[AddVehicle] Supabase vehicle created:', supabaseVehicle);

      // Step 4: Update local state
      const newVehicle: Vehicle = {
        id: supabaseVehicle.id,
        name: supabaseVehicle.name,
        traccar_device_id: supabaseVehicle.traccar_device_id,
        model: supabaseVehicle.model || '',
        license_plate: supabaseVehicle.license_plate || '',
      };
      addVehicle(newVehicle);

      // Reset form and close modal
      setName('');
      setUniqueId('');
      setModel('');
      setLicensePlate('');
      onClose();

    } catch (err: any) {
      console.error('[AddVehicle] Error:', err);
      setError(err.message || 'Failed to add vehicle');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
            <Plus className="w-5 h-5 text-blue-600" />
            Add New Vehicle
          </h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Display Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Toyota Camry"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Device Unique ID (IMEI/Serial) *
            </label>
            <input
              type="text"
              value={uniqueId}
              onChange={(e) => setUniqueId(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 123456789012345"
              required
              disabled={loading}
            />
            <p className="text-xs text-slate-500 mt-1">
              This must match the identifier sent by your GPS tracker.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Model
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Camry"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                License Plate
              </label>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., ABC-1234"
                disabled={loading}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-slate-600 bg-slate-100 rounded-lg font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white bg-blue-600 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading || !name || !uniqueId}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Vehicle'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
