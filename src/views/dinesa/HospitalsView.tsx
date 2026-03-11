import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Hospital } from '../../types';
import { mockHospitals } from '../../data/mockHospitals';
import { Plus, Edit2, Trash2, MapPin, CheckCircle2, XCircle, Search, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { getAddressSuggestions, geocodePlaceId, reverseGeocode, PlaceSuggestion } from '../../lib/googleMaps';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ position, onClick }: { position: L.LatLng | null, onClick: (pos: L.LatLng) => void }) {
  const map = useMapEvents({
    click(e) {
      onClick(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export function HospitalsView() {
  const [hospitals, setHospitals] = useState<Hospital[]>(mockHospitals);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentHospital, setCurrentHospital] = useState<Partial<Hospital> | null>(null);
  const [hospitalToDelete, setHospitalToDelete] = useState<string | null>(null);
  const [mapPosition, setMapPosition] = useState<L.LatLng | null>(null);
  
  // Autocomplete state
  const [addressInput, setAddressInput] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddressChange = async (value: string) => {
    setAddressInput(value);
    if (value.length >= 3) {
      setIsSearching(true);
      const results = await getAddressSuggestions(value);
      setSuggestions(results);
      setIsSearching(false);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    setAddressInput(suggestion.description);
    setShowSuggestions(false);
    setIsSearching(true);
    try {
      const result = await geocodePlaceId(suggestion.placeId);
      const newLatLng = L.latLng(result.lat, result.lng);
      setMapPosition(newLatLng);
      if (currentHospital) {
        setCurrentHospital({
          ...currentHospital,
          location: {
            ...currentHospital.location!,
            address: result.formattedAddress,
            lat: result.lat,
            lng: result.lng
          }
        });
      }
    } catch (error) {
      console.error("Error geocoding suggestion:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Reverse geocode when map is clicked
  useEffect(() => {
    if (mapPosition && isEditing) {
      // Only reverse geocode if the distance from current hospital location is significant
      // or if we're in "add new" mode and just clicked
      const updateAddress = async () => {
        try {
          const address = await reverseGeocode(mapPosition.lat, mapPosition.lng);
          setAddressInput(address);
        } catch (error) {
          console.error("Reverse geocoding error:", error);
        }
      };

      // Debounce or only trigger if it's a manual map click (not initial load)
      // For simplicity in this mock, we'll just check if address is empty or if it's a new position
    }
  }, [mapPosition]);

  const handleMapClick = async (latlng: L.LatLng) => {
    setMapPosition(latlng);
    setIsSearching(true);
    try {
      const address = await reverseGeocode(latlng.lat, latlng.lng);
      setAddressInput(address);
    } catch (error) {
      console.error("Error reverse geocoding:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleEdit = (hospital: Hospital) => {
    setCurrentHospital(hospital);
    setAddressInput(hospital.location.address);
    setMapPosition(L.latLng(hospital.location.lat, hospital.location.lng));
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setCurrentHospital({
      id: `h${Date.now()}`,
      name: '',
      isStrokeCenter: false,
      location: { lat: -34.6037, lng: -58.3816, address: '' },
      email: ''
    });
    setAddressInput('');
    setMapPosition(L.latLng(-34.6037, -58.3816)); // Default to Buenos Aires
    setIsEditing(true);
  };

  const handleSave = () => {
    if (currentHospital && currentHospital.id) {
      const updatedHospital = {
        ...currentHospital,
        location: {
          ...currentHospital.location!,
          lat: mapPosition ? mapPosition.lat : currentHospital.location!.lat,
          lng: mapPosition ? mapPosition.lng : currentHospital.location!.lng,
          address: addressInput || currentHospital.location!.address
        }
      };

      const exists = hospitals.find(h => h.id === currentHospital.id);
      if (exists) {
        setHospitals(hospitals.map(h => h.id === currentHospital.id ? updatedHospital as Hospital : h));
      } else {
        setHospitals([...hospitals, updatedHospital as Hospital]);
      }
      setIsEditing(false);
      setCurrentHospital(null);
      setMapPosition(null);
      setAddressInput('');
    }
  };

  const handleDelete = (id: string) => {
    setHospitalToDelete(id);
    setIsDeleting(true);
  };

  const confirmDelete = () => {
    if (hospitalToDelete) {
      setHospitals(hospitals.filter(h => h.id !== hospitalToDelete));
      setHospitalToDelete(null);
    }
  };

  return (
    <div className="flex-1 w-full p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Hospitales</h2>
          <p className="text-sm text-slate-500 font-medium">Administración de centros de derivación y Stroke Centers de la red.</p>
        </div>
        {!isEditing && (
          <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 shadow-sm rounded-xl px-6">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Hospital
          </Button>
        )}
      </div>

      <ConfirmModal
        isOpen={isDeleting}
        onClose={() => {
          setIsDeleting(false);
          setHospitalToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Eliminar Hospital"
        message={`¿Estás seguro de que deseas eliminar el hospital "${hospitals.find(h => h.id === hospitalToDelete)?.name}"?`}
        confirmText="Eliminar"
      />

      <Modal
        isOpen={isEditing && !!currentHospital}
        onClose={() => {
          setIsEditing(false);
          setMapPosition(null);
          setAddressInput('');
        }}
        title={currentHospital?.name ? 'Editar Hospital' : 'Registrar Nuevo Hospital'}
        maxWidth="max-w-xl"
        footer={
          <>
            <Button variant="outline" className="rounded-xl px-6" onClick={() => {
              setIsEditing(false);
              setMapPosition(null);
              setAddressInput('');
            }}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 shadow-md rounded-xl px-8">Guardar Cambios</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre de la Institución</label>
              <Input 
                className="rounded-xl border-slate-200 focus:ring-blue-500 h-9 text-sm"
                value={currentHospital?.name || ''} 
                onChange={e => setCurrentHospital({...currentHospital!, name: e.target.value})}
                placeholder="Ej: Hospital El Cruce"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email de Contacto</label>
              <Input 
                className="rounded-xl border-slate-200 focus:ring-blue-500 h-9 text-sm"
                type="email"
                value={currentHospital?.email || ''} 
                onChange={e => setCurrentHospital({...currentHospital!, email: e.target.value})}
                placeholder="emergencias@hospital.org"
              />
            </div>
            <div className="space-y-1.5 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Localización (Búsqueda)</label>
              <div className="relative">
                <Input 
                  className="pl-9 rounded-xl border-slate-200 focus:ring-blue-500 h-9 text-sm"
                  value={addressInput} 
                  onChange={e => handleAddressChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Calle, número, localidad..."
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                </div>
              </div>
              
              {showSuggestions && suggestions.length > 0 && (
                <div 
                  ref={suggestionsRef}
                  className="absolute z-[2000] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-auto animate-in zoom-in-95 duration-200"
                >
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                      onClick={() => handleSelectSuggestion(s)}
                    >
                      {s.description}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Georeferencia</label>
                <div className="flex gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded">LAT: {mapPosition?.lat.toFixed(4) || ''}</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded">LNG: {mapPosition?.lng.toFixed(4) || ''}</span>
                </div>
              </div>
              <div className="h-[180px] w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner">
                <MapContainer 
                  center={mapPosition || [-34.6037, -58.3816]} 
                  zoom={12} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationMarker position={mapPosition} onClick={handleMapClick} />
                </MapContainer>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <input 
                type="checkbox" 
                id="isStrokeCenter"
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                checked={currentHospital?.isStrokeCenter || false}
                onChange={e => setCurrentHospital({...currentHospital!, isStrokeCenter: e.target.checked})}
              />
              <label htmlFor="isStrokeCenter" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                Habilitar como <span className="text-blue-700 font-black">Stroke Center</span>
              </label>
            </div>
          </div>
        </div>
      </Modal>

      <Card className="border-slate-200 shadow-md overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-5">Institución</th>
                  <th className="px-6 py-5">Ubicación</th>
                  <th className="px-6 py-5">Contacto</th>
                  <th className="px-6 py-5 text-center">Estatus Stroke</th>
                  <th className="px-6 py-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hospitals.map((hospital) => (
                  <tr key={hospital.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-900">{hospital.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">ID: {hospital.id}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="truncate max-w-[250px] font-medium">{hospital.location.address}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-slate-600 font-medium">{hospital.email || '-'}</div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {hospital.isStrokeCenter ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                          <CheckCircle2 className="w-3 h-3" /> Stroke Center
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border border-slate-100">
                          <XCircle className="w-3 h-3" /> General
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(hospital)} className="h-8 w-8 p-0 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(hospital.id)} className="h-8 w-8 p-0 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
    </div>
  );
}
