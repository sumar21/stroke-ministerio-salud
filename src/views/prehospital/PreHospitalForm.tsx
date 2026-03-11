import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Input, Textarea } from '../../components/Input';
import { PatientData } from '../../types';
import { AlertCircle, MapPin, RefreshCw, Search, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '../../components/ui/combobox';
import { TimePicker } from '../../components/ui/time-picker';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { geocodeAddress, reverseGeocode, getAddressSuggestions, PlaceSuggestion, geocodePlaceId } from '../../lib/googleMaps';

// Fix leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
    map.invalidateSize(); // Ensure map resizes correctly
  }, [center, map]);
  return null;
}

const SYMPTOMS_LIST = [
  'Desviación de la comisura labial',
  'Debilidad en brazo o pierna',
  'Dificultad para hablar o entender',
  'Pérdida de visión súbita',
  'Pérdida de equilibrio/coordinación',
  'Cefalea intensa súbita'
];

const sexOptions = [
  { label: "Masculino", value: "M" },
  { label: "Femenino", value: "F" },
  { label: "Otro", value: "X" }
];

const coverageOptions = [
  { label: "Obra Social", value: "OBRA_SOCIAL" },
  { label: "Prepaga", value: "PREPAGA" },
  { label: "Público", value: "PUBLICO" },
  { label: "Sin Cobertura", value: "SIN_COBERTURA" }
];

interface PreHospitalFormProps {
  onSubmit: (data: PatientData, status?: any, preAssignedHospitalId?: string, etaText?: string) => void;
  onCancel: () => void;
}

export function PreHospitalForm({ onSubmit, onCancel }: PreHospitalFormProps) {
  const isMounted = useRef(true);
  const [isLocating, setIsLocating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados de búsqueda
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Ref para ignorar la búsqueda cuando se selecciona una sugerencia
  const ignoreSearchRef = useRef(false);

  const handleSearchChange = async (value: string) => {
    setSearchAddress(value);
    
    if (value.length >= 3) {
      // Buscamos sugerencias
      const results = await getAddressSuggestions(value, formData.location.lat, formData.location.lng);
      if (isMounted.current) {
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [formData, setFormData] = useState<PatientData>({
    id: '',
    name: '',
    age: '',
    sex: '',
    coverage: '',
    symptomOnsetTime: '',
    symptoms: [],
    contactInfo: '',
    clinicalObservations: '',
    location: {
      lat: -34.6037,
      lng: -58.3816,
      address: 'Obteniendo ubicación...'
    }
  });

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const getLocation = useCallback(async (highAccuracy = true) => {
    if (!navigator.geolocation) {
      if (isMounted.current) setIsLocating(false);
      return;
    }

    if (isMounted.current) {
      setIsLocating(true);
      setFormData(prev => ({
        ...prev,
        location: { ...prev.location, address: 'Obteniendo ubicación...' }
      }));
    }

    try {
      const timeoutMs = highAccuracy ? 8000 : 5000;
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Timeout: No se obtuvo respuesta en ${timeoutMs}ms.`));
        }, timeoutMs);

        navigator.geolocation.getCurrentPosition(
          (pos) => { clearTimeout(timeoutId); resolve(pos); },
          (err) => { clearTimeout(timeoutId); reject(err); },
          { enableHighAccuracy: highAccuracy, maximumAge: 0 }
        );
      });

      const { latitude, longitude } = position.coords;

      try {
        const address = await reverseGeocode(latitude, longitude);
        if (isMounted.current) {
          setFormData(prev => ({
            ...prev,
            location: { lat: latitude, lng: longitude, address: address }
          }));
          // Evitar que la geolocalización automática dispare la búsqueda de sugerencias
          ignoreSearchRef.current = true;
          setSearchAddress(address);
        }
      } catch (geocodeError) {
        if (isMounted.current) {
          setFormData(prev => ({
            ...prev,
            location: { lat: latitude, lng: longitude, address: 'Ubicación detectada (Sin red para calle)' }
          }));
        }
      }

      if (isMounted.current) setIsLocating(false);

    } catch (error: any) {
      if (highAccuracy) {
        if (isMounted.current) getLocation(false);
      } else {
        if (isMounted.current) {
          let errorMsg = 'No se pudo obtener ubicación.';
          if (error.code === 1) errorMsg = 'Permiso denegado.';
          else if (error.code === 2) errorMsg = 'Ubicación no disponible.';
          else if (error.code === 3) errorMsg = 'Tiempo de espera agotado.';
          
          setFormData(prev => ({
            ...prev,
            location: { ...prev.location, address: `${errorMsg} Intente buscarla manualmente.` }
          }));
          setIsLocating(false);
        }
      }
    }
  }, []);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    setIsSearching(true);
    setShowSuggestions(false);
    
    // Marcar para ignorar el efecto de búsqueda al actualizar el texto
    ignoreSearchRef.current = true;
    setSearchAddress(suggestion.description);
    
    try {
      const result = await geocodePlaceId(suggestion.placeId);
      setFormData(prev => ({
        ...prev,
        location: {
          lat: result.lat,
          lng: result.lng,
          address: result.formattedAddress
        }
      }));
    } catch (error) {
      alert("Error al obtener las coordenadas de la sugerencia seleccionada.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualSearch = async () => {
    if (!searchAddress.trim()) return;
    setIsSearching(true);
    setShowSuggestions(false);
    
    try {
      const result = await geocodeAddress(searchAddress);
      setFormData(prev => ({
        ...prev,
        location: {
          lat: result.lat,
          lng: result.lng,
          address: result.formattedAddress
        }
      }));
      
      // Marcar para ignorar el efecto al actualizar con la dirección formateada
      ignoreSearchRef.current = true;
      setSearchAddress(result.formattedAddress);
    } catch (error) {
      alert("No se pudo encontrar la dirección exacta. Intente usar una de las sugerencias desplegables.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSymptomToggle = (symptom: string) => {
    setFormData(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/submit-acv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error('Error al enviar el código ACV');
      }
      
      const result = await response.json();
      
      // Call the original onSubmit with the updated data
      onSubmit(formData, result.status, result.preAssignedHospitalId, result.etaText);
    } catch (error) {
      console.error(error);
      alert('Error al enviar el código ACV');
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-50/50 pb-10"
    >
      <header className="bg-white text-slate-900 p-4 sticky top-0 z-10 border-b border-slate-200">
        <div className="flex justify-between items-center max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              ← Cancelar
            </Button>
            <h1 className="font-bold text-lg">Nuevo Reporte</h1>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-3xl mx-auto mt-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <Card className="shadow-sm border-slate-200/60">
              <CardHeader>
                <CardTitle>Datos del Paciente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input 
                    label="DNI / Identificación" 
                    placeholder="Ej: 12345678"
                    value={formData.id}
                    onChange={e => setFormData({...formData, id: e.target.value})}
                  />
                  <Input 
                    label="Nombre Completo" 
                    placeholder="Ej: Juan Pérez"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                  <Input 
                    label="Edad" 
                    type="number"
                    placeholder="Ej: 65"
                    value={formData.age}
                    onChange={e => setFormData({...formData, age: e.target.value ? Number(e.target.value) : ''})}
                  />
                  
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-sm font-semibold text-slate-700">Sexo</label>
                    <Combobox 
                      items={sexOptions} 
                      value={formData.sex} 
                      onValueChange={(val) => setFormData({...formData, sex: val as any})}
                    >
                      <ComboboxInput placeholder="Seleccionar..." />
                      <ComboboxContent>
                        <ComboboxEmpty>No se encontraron opciones.</ComboboxEmpty>
                        <ComboboxList>
                          {(item) => (
                            <ComboboxItem key={item.value} value={item.value}>
                              {item.label}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  </div>

                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-sm font-semibold text-slate-700">Cobertura</label>
                    <Combobox 
                      items={coverageOptions} 
                      value={formData.coverage} 
                      onValueChange={(val) => setFormData({...formData, coverage: val as any})}
                    >
                      <ComboboxInput placeholder="Seleccionar..." />
                      <ComboboxContent>
                        <ComboboxEmpty>No se encontraron opciones.</ComboboxEmpty>
                        <ComboboxList>
                          {(item) => (
                            <ComboboxItem key={item.value} value={item.value}>
                              {item.label}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  </div>

                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-sm font-semibold text-slate-700">Hora Inicio Síntomas</label>
                    <TimePicker 
                      value={formData.symptomOnsetTime}
                      onChange={(val) => setFormData({...formData, symptomOnsetTime: val})}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <label className="text-sm font-semibold text-slate-700 mb-3 block">Síntomas Clave (Checklist)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SYMPTOMS_LIST.map(symptom => (
                      <label 
                        key={symptom} 
                        className={`flex items-center gap-3 p-4 rounded-md border cursor-pointer transition-all duration-200 ${
                          formData.symptoms.includes(symptom) 
                            ? 'border-slate-400 bg-slate-50 text-slate-900 shadow-sm' 
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-slate-300 text-red-500 focus:ring-red-400 focus:ring-offset-0 transition-all"
                          checked={formData.symptoms.includes(symptom)}
                          onChange={() => handleSymptomToggle(symptom)}
                        />
                        <span className="font-medium text-sm">{symptom}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <Input 
                    label="Contacto de Familiar (Teléfono)" 
                    placeholder="Ej: 11 1234-5678"
                    value={formData.contactInfo}
                    onChange={e => setFormData({...formData, contactInfo: e.target.value})}
                  />
                  <Textarea 
                    label="Observaciones Clínicas" 
                    placeholder="Breve descripción del estado del paciente..."
                    value={formData.clinicalObservations}
                    onChange={e => setFormData({...formData, clinicalObservations: e.target.value})}
                  />
                  
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      {isLocating ? (
                        <Loader2 className="w-5 h-5 text-slate-400 shrink-0 mt-0.5 animate-spin" />
                      ) : (
                        <MapPin className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 w-full min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="text-sm font-semibold text-slate-700">Ubicación (Georreferenciación)</p>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs text-slate-500 hover:text-slate-900 shrink-0"
                            onClick={() => getLocation(true)}
                            disabled={isLocating}
                          >
                            <RefreshCw className={`w-3 h-3 mr-1 ${isLocating ? 'animate-spin' : ''}`} />
                            Auto-detectar
                          </Button>
                        </div>
                        
                        <div className="relative w-full">
                          <div className="flex gap-2 mb-2">
                            <Input 
                              placeholder="Buscar (Ej: Pinto 4457 Lanus)..." 
                              value={searchAddress}
                              onChange={(e) => handleSearchChange(e.target.value)}
                              onFocus={() => {
                                if (suggestions.length > 0) setShowSuggestions(true);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleManualSearch();
                                }
                              }}
                              className="flex-1 rounded-xl"
                            />
                            <Button 
                              type="button" 
                              variant="secondary" 
                              onClick={handleManualSearch}
                              disabled={isSearching || !searchAddress.trim()}
                              className="rounded-xl"
                            >
                              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            </Button>
                          </div>

                          {showSuggestions && suggestions.length > 0 && (
                            <div 
                              ref={suggestionsRef}
                              className="absolute top-[42px] left-0 right-[52px] bg-white border border-slate-200 rounded-xl shadow-xl z-[2000] max-h-[200px] overflow-y-auto animate-in zoom-in-95 duration-200"
                            >
                              {suggestions.map((item) => (
                                <button
                                  key={item.placeId}
                                  type="button"
                                  className="w-full text-left px-4 py-3 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-start gap-2 text-slate-700 transition-colors"
                                  onClick={() => handleSelectSuggestion(item)}
                                >
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                  <span className="line-clamp-2 font-medium">{item.description}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <p className="text-slate-600 text-sm mt-1 leading-relaxed">{formData.location.address}</p>
                        {!isLocating && (
                          <p className="text-xs text-slate-400 mt-1 font-mono">Lat: {formData.location.lat.toFixed(6)}, Lng: {formData.location.lng.toFixed(6)}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="h-[200px] w-full rounded-xl overflow-hidden border border-slate-200 relative z-0 shadow-inner">
                      <MapContainer 
                        center={[formData.location.lat, formData.location.lng]} 
                        zoom={15} 
                        scrollWheelZoom={false} 
                        style={{ height: '100%', width: '100%', zIndex: 0 }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[formData.location.lat, formData.location.lng]} />
                        <MapUpdater center={[formData.location.lat, formData.location.lng]} />
                      </MapContainer>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="pt-4">
            <Button 
              type="submit" 
              variant="danger" 
              size="xl" 
              className="w-full text-lg uppercase tracking-wider shadow-md shadow-red-500/20 transition-all relative overflow-hidden"
              disabled={formData.symptoms.length === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  Procesando y Asignando...
                </>
              ) : (
                <>
                  <AlertCircle className="w-6 h-6 mr-2" />
                  Declarar Código ACV
                </>
              )}
            </Button>
            {formData.symptoms.length === 0 && !isSubmitting && (
              <p className="text-center text-sm text-slate-500 mt-2">
                Seleccione al menos un síntoma para activar el código.
              </p>
            )}
            {isSubmitting && (
              <p className="text-center text-sm text-slate-500 mt-2 animate-pulse">
                Calculando ruta óptima y enviando notificaciones...
              </p>
            )}
          </div>
        </form>
      </main>
    </motion.div>
  );
}
