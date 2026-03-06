import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Input, Textarea } from '../components/Input';
import { AcvCase, PatientData } from '../types';
import { AlertCircle, CheckCircle2, MapPin, Activity, Clock, LogOut, Ambulance, Loader2, RefreshCw, Search } from 'lucide-react';
import { motion } from 'motion/react';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '../components/ui/combobox';
import { TimePicker } from '../components/ui/time-picker';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { geocodeAddress, reverseGeocode } from '../lib/googleMaps';

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
  }, [center, map]);
  return null;
}

interface PreHospitalViewProps {
  onLogout: () => void;
  onSubmitCase: (patientData: PatientData) => void;
  activeCase: AcvCase | null;
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

export function PreHospitalView({ onLogout, onSubmitCase, activeCase }: PreHospitalViewProps) {
  const [isLocating, setIsLocating] = useState(true);
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
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

  const getLocation = (highAccuracy = true) => {
    if (!navigator.geolocation) {
      setIsLocating(false);
      return;
    }

    setIsLocating(true);
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        address: 'Obteniendo ubicación...'
      }
    }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const address = await reverseGeocode(latitude, longitude);
          
          setFormData(prev => ({
            ...prev,
            location: {
              lat: latitude,
              lng: longitude,
              address: address
            }
          }));
          setSearchAddress(address);
        } catch (error) {
          setFormData(prev => ({
            ...prev,
            location: {
              ...prev.location,
              lat: latitude,
              lng: longitude,
              address: 'Ubicación detectada (Sin conexión a mapas)'
            }
          }));
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.warn("Error getting location:", error.message);
        if (highAccuracy && (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)) {
          console.log("Retrying with low accuracy...");
          getLocation(false);
          return;
        }
        setFormData(prev => ({
          ...prev,
          location: {
            ...prev.location,
            address: 'No se pudo obtener la ubicación exacta. Verifique los permisos o intente buscar manualmente.'
          }
        }));
        setIsLocating(false);
      },
      { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 15000 : 10000, maximumAge: 0 }
    );
  };

  const handleManualSearch = async () => {
    if (!searchAddress.trim()) return;
    
    setIsSearching(true);
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
      setSearchAddress(result.formattedAddress);
    } catch (error) {
      alert("No se pudo encontrar la dirección. Intente ser más específico (ej: 'Av. Corrientes 1234, CABA').");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!activeCase) {
      getLocation();
    }
  }, [activeCase]);

  const handleSymptomToggle = (symptom: string) => {
    setFormData(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitCase(formData);
  };

  if (activeCase) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-slate-50 pb-24"
      >
        <header className="bg-red-600 text-white p-4 sticky top-0 z-10 shadow-md">
          <div className="flex justify-between items-center max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <Activity className="w-6 h-6" />
              <h1 className="font-bold text-lg">CÓDIGO ACV ACTIVO</h1>
            </div>
            <Button variant="ghost" className="text-white hover:bg-red-700 hover:text-white" onClick={onLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <main className="p-4 max-w-3xl mx-auto mt-4 space-y-4">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center animate-pulse">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-red-900 mb-2">Alerta Enviada a DINESA</h2>
                  <p className="text-red-700 text-lg">
                    El caso ha sido registrado y notificado a la central nacional.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader>
                <CardTitle>Estado de Asignación</CardTitle>
              </CardHeader>
              <CardContent>
                {activeCase.status === 'PENDING_ASSIGNMENT' ? (
                  <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200 text-amber-800">
                    <Clock className="w-8 h-8 animate-spin-slow" />
                    <div>
                      <p className="font-bold text-lg">Esperando Hospital</p>
                      <p>DINESA está evaluando el mejor centro de stroke...</p>
                    </div>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800"
                  >
                    <CheckCircle2 className="w-8 h-8" />
                    <div>
                      <p className="font-bold text-lg">Hospital Asignado</p>
                      <p>Diríjase inmediatamente a:</p>
                      <p className="font-black text-xl mt-1">{activeCase.assignedHospitalId}</p>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader>
                <CardTitle>Datos del Paciente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Nombre:</strong> {activeCase.patient.name || 'No especificado'}</p>
                <p><strong>DNI:</strong> {activeCase.patient.id || 'No especificado'}</p>
                <p><strong>Edad:</strong> {activeCase.patient.age || 'No especificada'}</p>
                <p><strong>Inicio Síntomas:</strong> {activeCase.patient.symptomOnsetTime || 'Desconocido'}</p>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-50/50 pb-40"
    >
      <header className="bg-white text-slate-900 p-4 sticky top-0 z-10 border-b border-slate-200">
        <div className="flex justify-between items-center max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <Ambulance className="w-6 h-6 text-red-600" />
            <h1 className="font-bold text-lg">Prehospitalario</h1>
          </div>
          <Button variant="ghost" className="text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={onLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-3xl mx-auto mt-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <Card className="shadow-sm border-slate-200/60">
              <CardHeader>
                <CardTitle>Nuevo Caso ACV</CardTitle>
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
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="text-sm font-semibold text-slate-700">Ubicación (Georreferenciación)</p>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs text-slate-500 hover:text-slate-900"
                            onClick={() => getLocation(true)}
                            disabled={isLocating}
                          >
                            <RefreshCw className={`w-3 h-3 mr-1 ${isLocating ? 'animate-spin' : ''}`} />
                            Auto-detectar
                          </Button>
                        </div>
                        
                        <div className="flex gap-2 mb-2">
                          <Input 
                            placeholder="Buscar dirección manualmente..." 
                            value={searchAddress}
                            onChange={(e) => setSearchAddress(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleManualSearch();
                              }
                            }}
                            className="flex-1"
                          />
                          <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={handleManualSearch}
                            disabled={isSearching || !searchAddress.trim()}
                          >
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                          </Button>
                        </div>

                        <p className="text-slate-600 text-sm mt-1 leading-relaxed">{formData.location.address}</p>
                        {!isLocating && (
                          <p className="text-xs text-slate-400 mt-1 font-mono">Lat: {formData.location.lat.toFixed(6)}, Lng: {formData.location.lng.toFixed(6)}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="h-[200px] w-full rounded-md overflow-hidden border border-slate-200 relative z-0">
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

          <motion.div 
            initial={{ y: 100 }} 
            animate={{ y: 0 }} 
            transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.2 }}
            className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20"
          >
            <div className="max-w-3xl mx-auto">
              <Button 
                type="submit" 
                variant="danger" 
                size="xl" 
                className="w-full text-lg uppercase tracking-wider shadow-md shadow-red-500/20 transition-all"
                disabled={formData.symptoms.length === 0}
              >
                <AlertCircle className="w-6 h-6 mr-2" />
                Declarar Código ACV
              </Button>
              {formData.symptoms.length === 0 && (
                <p className="text-center text-sm text-slate-500 mt-2">
                  Seleccione al menos un síntoma para activar el código.
                </p>
              )}
            </div>
          </motion.div>
        </form>
      </main>
    </motion.div>
  );
}
