import { useState } from 'react';
import { traccarCreateDevice } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useGPSStore } from '../lib/store';
import { X, Loader2, Plus } from 'lucide-react';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddVehicleModal({ isOpen, onClose }: AddVehicleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    uniqueId: '',
    model: '',
    licensePlate: '',
  });

  const addVehicle = useGPSStore((state) => state.addVehicle);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to add a vehicle');

      // 2. Create device in Traccar
      console.log('[AddVehicle] Creating device in Traccar...');
      const traccarDevice = await traccarCreateDevice(formData.name, formData.uniqueId);

      // 3. Create vehicle in Supabase
      console.log('[AddVehicle] Creating vehicle in Supabase...');
      const { data: vehicle, error: supabaseError } = await supabase
        .from('vehicles')
        .insert({
          user_id: user.id,
          traccar_device_id: traccarDevice.id,
          name: formData.name,
          model: formData.model,
          license_plate: formData.licensePlate,
        })
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      // 4. Update local store
      addVehicle(vehicle);
      
      // Success!
      onClose();
      setFormData({ name: '', uniqueId: '', model: '', licensePlate: '' });
    } catch (err: any) {
      console.error('[AddVehicle] Error:', err);
      setError(err.message || 'Failed to add vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" /> Add New Vehicle
          </h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Display Name</label>
            <input
              required
              type="text"
              placeholder="e.g. My Truck"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Device Unique ID (IMEI/Serial)</label>
            <input
              required
              type="text"
              placeholder="e.g. 123456789"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.uniqueId}
              onChange={(e) => setFormData({ ...formData, uniqueId: e.target.value })}
            />
            <p className="text-[10px] text-slate-400">This must match the identifier sent by your GPS tracker.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Model</label>
              <input
                type="text"
                placeholder="e.g. Toyota Hilux"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">License Plate</label>
              <input
                type="text"
                placeholder="e.g. ABC-123"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.licensePlate}
                onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
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
