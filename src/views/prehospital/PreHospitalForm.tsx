import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Input, Textarea } from '../../components/Input';
import { Hospital, PatientData } from '../../types';
import { AlertCircle, Clock, MapPin, RefreshCw, Search, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
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
import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from '@react-google-maps/api';
import polyline from '@mapbox/polyline';
import { geocodeAddress, reverseGeocode, getAddressSuggestions, getRouteToHospital, PlaceSuggestion, RouteMetrics, geocodePlaceId } from '../../lib/googleMaps';
import { mockHospitals } from '../../data/mockHospitals';

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const mapLibraries: ('places')[] = ['places'];

const BEFAST_QUESTIONS = [
  { id: 'equilibrio', label: '¿Sufrió una pérdida repentina del equilibrio o mareo intenso?' },
  { id: 'vision',     label: '¿Perdió la visión en un ojo o ve doble/borroso de repente?' },
  { id: 'cara',       label: '¿Un lado de la cara está caído o no se mueve?' },
  { id: 'brazos',     label: '¿Uno de los brazos se cae o no puede subirlo?' },
  { id: 'habla',      label: '¿Arrastra las palabras o suena extraño?' },
];

const sexOptions = [
  { label: 'Masculino', value: 'M' },
  { label: 'Femenino',  value: 'F' },
  { label: 'Otro',      value: 'X' },
];

const PREGNANCY_OPTIONS: { label: string; value: import('../../types').RecentPregnancy }[] = [
  { label: 'En curso',  value: 'en_curso' },
  { label: '3 meses',   value: '3_meses' },
  { label: '6 meses',   value: '6_meses' },
];

// ── Inline helpers ──────────────────────────────────────────────────────────

function YesNoToggle({
  value,
  onChange,
}: {
  value: boolean | null | undefined;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-5 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
          value === true
            ? 'bg-brand-navy text-white border-brand-navy shadow-sm'
            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
        }`}
      >
        Sí
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-5 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
          value === false
            ? 'bg-slate-600 text-white border-slate-600 shadow-sm'
            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
        }`}
      >
        No
      </button>
    </div>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm font-medium text-slate-700 flex-1">{label}</span>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

interface PreHospitalFormProps {
  onSubmit: (data: PatientData, status?: any, preAssignedHospitalId?: string, etaText?: string) => void;
  onCancel: () => void;
}

export function PreHospitalForm({ onSubmit, onCancel }: PreHospitalFormProps) {
  const isMounted = useRef(true);
  const { isLoaded: isGoogleMapsLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey || '',
    libraries: mapLibraries,
  });

  const [isLocating, setIsLocating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Address search
  const [searchAddress, setSearchAddress] = useState('');
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const ignoreSearchRef = useRef(false);

  // Route
  const [nearestHospital, setNearestHospital] = useState<Hospital | null>(null);
  const [nearestRoute, setNearestRoute] = useState<RouteMetrics | null>(null);
  const [routePath, setRoutePath] = useState<{ lat: number; lng: number }[] | null>(null);
  const [isCalculatingNearestRoute, setIsCalculatingNearestRoute] = useState(false);
  const [nearestRouteError, setNearestRouteError] = useState<string | null>(null);
  const routeRequestIdRef = useRef(0);
  const [mapRef, setMapRef] = useState<any>(null);

  const [formData, setFormData] = useState<PatientData>({
    id: '',
    name: '',
    age: '',
    sex: '',
    hasCoverage: null,
    // Módulo 2
    systolicBP: '',
    diastolicBP: '',
    bloodPressureMeds: null,
    glucemia: '',
    temperature: '',
    heartRate: '',
    pulseRegular: null,
    recentPregnancy: null,
    priorStroke: null,
    recentCranialTrauma: null,
    // Módulo 3
    symptomOnsetTime: '',
    symptoms: ['equilibrio:no', 'vision:no', 'cara:no', 'brazos:no', 'habla:no'],
    contactInfo: '',
    clinicalObservations: '',
    location: { lat: -34.6037, lng: -58.3816, address: 'Obteniendo ubicación...' },
  });

  // ── Criteria ──────────────────────────────────────────────────────────────

  const meetsAgeCriteria = typeof formData.age === 'number' && formData.age >= 18;
  // Only count "Sí" answers — "No" answers are stored with a ':no' suffix
  const meetsSymptomCriteria = formData.symptoms.some(s => !s.endsWith(':no'));
  const qualifiesForCode = meetsAgeCriteria && meetsSymptomCriteria;
  const ageEntered = formData.age !== '' && formData.age !== undefined;

  const isPatientDataComplete =
    formData.name.trim() !== '' &&
    formData.age !== '' &&
    formData.age !== undefined &&
    formData.sex !== '';

  const isHospitalReady = !isCalculatingNearestRoute && nearestHospital !== null;

  const canSubmit = isPatientDataComplete && isHospitalReady;

  const submitBlockReason = !isPatientDataComplete
    ? 'Complete nombre, edad y sexo del paciente para continuar'
    : !isHospitalReady
    ? 'Esperando cálculo del hospital más cercano...'
    : null;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Address suggestions
  useEffect(() => {
    if (ignoreSearchRef.current) { ignoreSearchRef.current = false; return; }
    const query = searchAddress.trim();
    if (query.length < 3) { setSuggestions([]); setShowSuggestions(false); setIsFetchingSuggestions(false); return; }
    const timeout = setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const results = await getAddressSuggestions(query, formData.location.lat, formData.location.lng);
        if (!isMounted.current) return;
        setSuggestions(results);
        setShowSuggestions(true);
      } finally {
        if (isMounted.current) setIsFetchingSuggestions(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchAddress, formData.location.lat, formData.location.lng]);

  // Nearest hospital route
  useEffect(() => {
    const origin = { lat: formData.location.lat, lng: formData.location.lng };
    const strokeCenters = mockHospitals.filter(h => h.isStrokeCenter);
    if (!Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) return;
    if (strokeCenters.length === 0) {
      setNearestHospital(null); setNearestRoute(null); setRoutePath(null);
      setNearestRouteError('No hay hospitales activos configurados.');
      return;
    }
    const requestId = ++routeRequestIdRef.current;
    const calculateNearestRoute = async () => {
      setIsCalculatingNearestRoute(true);
      setNearestRouteError(null);
      const routeResults = await Promise.all(
        strokeCenters.map(async (hospital) => {
          try { return { hospital, metrics: await getRouteToHospital(origin, hospital.location) }; }
          catch { return null; }
        })
      );
      if (!isMounted.current || routeRequestIdRef.current !== requestId) return;
      const available = routeResults.filter(Boolean) as { hospital: Hospital; metrics: RouteMetrics }[];
      if (available.length === 0) {
        setNearestHospital(null); setNearestRoute(null); setRoutePath(null);
        setNearestRouteError('No se pudo calcular la ruta más cercana en este momento.');
        setIsCalculatingNearestRoute(false); return;
      }
      available.sort((a, b) => a.metrics.totalDurationSeconds - b.metrics.totalDurationSeconds);
      const best = available[0];
      setNearestHospital(best.hospital);
      setNearestRoute(best.metrics);
      const encoded = best.metrics.encodedPolyline;
      setRoutePath(encoded
        ? polyline.decode(encoded).map((p) => ({ lat: p[0], lng: p[1] }))
        : [{ lat: origin.lat, lng: origin.lng }, { lat: best.hospital.location.lat, lng: best.hospital.location.lng }]
      );
      setIsCalculatingNearestRoute(false);
    };
    void calculateNearestRoute();
  }, [formData.location.lat, formData.location.lng]);

  useEffect(() => {
    if (!mapRef || !(window as any).google) return;
    if (nearestHospital) {
      const bounds = new (window as any).google.maps.LatLngBounds();
      bounds.extend({ lat: formData.location.lat, lng: formData.location.lng });
      bounds.extend({ lat: nearestHospital.location.lat, lng: nearestHospital.location.lng });
      routePath?.forEach((p) => bounds.extend(p));
      mapRef.fitBounds(bounds, 50); return;
    }
    mapRef.panTo({ lat: formData.location.lat, lng: formData.location.lng });
    mapRef.setZoom(15);
  }, [mapRef, formData.location.lat, formData.location.lng, nearestHospital, routePath]);

  // ── Geolocation ───────────────────────────────────────────────────────────

  const getLocation = useCallback(async (highAccuracy = true) => {
    if (!navigator.geolocation) { if (isMounted.current) setIsLocating(false); return; }
    if (isMounted.current) {
      setIsLocating(true);
      setFormData(prev => ({ ...prev, location: { ...prev.location, address: 'Obteniendo ubicación...' } }));
    }
    try {
      const timeoutMs = highAccuracy ? 12000 : 8000;
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const tid = setTimeout(() => reject(new Error(`Timeout: ${timeoutMs}ms`)), timeoutMs);
        navigator.geolocation.getCurrentPosition(
          (pos) => { clearTimeout(tid); resolve(pos); },
          (err) => { clearTimeout(tid); reject(err); },
          { enableHighAccuracy: highAccuracy, maximumAge: highAccuracy ? 30000 : 300000, timeout: timeoutMs }
        );
      });
      const { latitude, longitude } = position.coords;
      try {
        const address = await reverseGeocode(latitude, longitude);
        if (isMounted.current) {
          setFormData(prev => ({ ...prev, location: { lat: latitude, lng: longitude, address } }));
          ignoreSearchRef.current = true;
          setSearchAddress(address);
        }
      } catch {
        if (isMounted.current)
          setFormData(prev => ({ ...prev, location: { lat: latitude, lng: longitude, address: 'Ubicación detectada (sin dirección)' } }));
      }
      if (isMounted.current) setIsLocating(false);
    } catch (error: any) {
      if (highAccuracy) { if (isMounted.current) getLocation(false); }
      else {
        if (isMounted.current) {
          let msg = 'No se pudo obtener ubicación.';
          if (error.code === 1) msg = 'Permiso denegado.';
          else if (error.code === 2) msg = 'Ubicación no disponible.';
          else if (error.code === 3) msg = 'Tiempo de espera agotado.';
          setFormData(prev => ({ ...prev, location: { ...prev.location, address: `${msg} Intente buscarla manualmente.` } }));
          setIsLocating(false);
        }
      }
    }
  }, []);

  useEffect(() => { getLocation(); }, [getLocation]);

  // ── Address search handlers ───────────────────────────────────────────────

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    setIsSearching(true); setShowSuggestions(false);
    ignoreSearchRef.current = true;
    setSearchAddress(suggestion.description);
    try {
      const result = await geocodePlaceId(suggestion.placeId);
      setFormData(prev => ({ ...prev, location: { lat: result.lat, lng: result.lng, address: result.formattedAddress } }));
    } catch { alert('Error al obtener las coordenadas de la sugerencia seleccionada.'); }
    finally { setIsSearching(false); }
  };

  const handleManualSearch = async () => {
    if (!searchAddress.trim()) return;
    setIsSearching(true); setShowSuggestions(false);
    try {
      const result = await geocodeAddress(searchAddress);
      setFormData(prev => ({ ...prev, location: { lat: result.lat, lng: result.lng, address: result.formattedAddress } }));
      ignoreSearchRef.current = true;
      setSearchAddress(result.formattedAddress);
    } catch { alert('No se pudo encontrar la dirección exacta. Intente usar una de las sugerencias desplegables.'); }
    finally { setIsSearching(false); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formatDuration = (s: number) => `${Math.max(1, Math.round(s / 60))} min`;
  const formatDistance = (m: number) => `${(m / 1000).toFixed(1)} km`;

  const update = (patch: Partial<PatientData>) => setFormData(prev => ({ ...prev, ...patch }));

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!qualifiesForCode) {
        // Register case without triggering ACV code or notifications — saved silently
        onSubmit(formData, 'SAVED');
        return;
      }
      const response = await fetch('/api/submit-acv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Error al enviar el código ACV');
      const result = await response.json();
      const resolvedHospitalId = nearestHospital?.id ?? result.preAssignedHospitalId;
      const resolvedEtaText = nearestRoute
        ? `${Math.max(1, Math.round(nearestRoute.totalDurationSeconds / 60))} min`
        : result.etaText ?? null;
      onSubmit(formData, result.status, resolvedHospitalId, resolvedEtaText);
    } catch (error) {
      console.error(error);
      alert('Error al enviar el código ACV');
    } finally {
      if (isMounted.current) setIsSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-slate-50/50 pb-10">
      <header className="bg-white text-slate-900 p-4 sticky top-0 z-10 border-b border-slate-200">
        <div className="flex justify-between items-center max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>← Cancelar</Button>
            <h1 className="font-bold text-lg">Nuevo Reporte</h1>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-3xl mx-auto mt-4">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Módulo 1: Datos del Paciente ── */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <Card className="shadow-sm border-slate-200/60">
              <CardHeader>
                <CardTitle>Módulo 1 · Datos del Paciente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="DNI / Identificación"
                    placeholder="Ej: 12345678"
                    value={formData.id}
                    onChange={e => update({ id: e.target.value })}
                  />
                  <Input
                    label="Nombre Completo"
                    placeholder="Ej: Juan Pérez"
                    value={formData.name}
                    onChange={e => update({ name: e.target.value })}
                  />
                  <div className="flex flex-col gap-1.5">
                    <Input
                      label="Edad"
                      type="number"
                      placeholder="Ej: 65"
                      value={formData.age}
                      onChange={e => update({ age: e.target.value ? Number(e.target.value) : '' })}
                      className={ageEntered && !meetsAgeCriteria ? 'border-amber-400 focus-visible:border-amber-400 focus-visible:ring-amber-400' : ''}
                    />
                    {ageEntered && !meetsAgeCriteria && (
                      <p className="text-xs text-amber-600 mt-1 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Debe ser ≥ 18 años para habilitar código ACV
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-sm font-medium leading-none text-slate-700">Género</label>
                    <Combobox items={sexOptions} value={formData.sex} onValueChange={val => update({ sex: val as any })}>
                      <ComboboxInput placeholder="Seleccionar..." />
                      <ComboboxContent>
                        <ComboboxEmpty>No se encontraron opciones.</ComboboxEmpty>
                        <ComboboxList>{(item) => <ComboboxItem key={item.value} value={item.value}>{item.label}</ComboboxItem>}</ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  </div>

                  <div className="flex items-center justify-between gap-4 md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Cobertura</span>
                    <YesNoToggle value={formData.hasCoverage} onChange={v => update({ hasCoverage: v })} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Módulo 2: Parámetros Clínicos ── */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
            <Card className="shadow-sm border-slate-200/60">
              <CardHeader>
                <CardTitle>Módulo 2 · Parámetros Clínicos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Presión arterial */}
                <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                  <Input
                    label="Presión Arterial Sistólica (mmHg)"
                    type="number"
                    placeholder="Ej: 120"
                    value={formData.systolicBP ?? ''}
                    onChange={e => update({ systolicBP: e.target.value ? Number(e.target.value) : '' })}
                  />
                  <Input
                    label="Presión Arterial Diastólica (mmHg)"
                    type="number"
                    placeholder="Ej: 80"
                    value={formData.diastolicBP ?? ''}
                    onChange={e => update({ diastolicBP: e.target.value ? Number(e.target.value) : '' })}
                  />
                </div>

                <FieldRow label="¿Toma medicación para controlar la presión?">
                  <YesNoToggle value={formData.bloodPressureMeds} onChange={v => update({ bloodPressureMeds: v })} />
                </FieldRow>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-3 border-b border-slate-100">
                  <Input
                    label="Glucemia (mg/dl)"
                    type="number"
                    placeholder="Ej: 100"
                    value={formData.glucemia ?? ''}
                    onChange={e => update({ glucemia: e.target.value ? Number(e.target.value) : '' })}
                  />
                  <Input
                    label="Temperatura (°C)"
                    type="number"
                    placeholder="Ej: 36.5"
                    value={formData.temperature ?? ''}
                    onChange={e => update({ temperature: e.target.value ? Number(e.target.value) : '' })}
                  />
                  <Input
                    label="Frecuencia Cardíaca (lpm)"
                    type="number"
                    placeholder="Ej: 72"
                    value={formData.heartRate ?? ''}
                    onChange={e => update({ heartRate: e.target.value ? Number(e.target.value) : '' })}
                  />
                </div>

                <FieldRow label="¿Pulso regular o irregular?">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => update({ pulseRegular: true })}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                        formData.pulseRegular === true
                          ? 'bg-brand-navy text-white border-brand-navy shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      Regular
                    </button>
                    <button
                      type="button"
                      onClick={() => update({ pulseRegular: false })}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                        formData.pulseRegular === false
                          ? 'bg-slate-600 text-white border-slate-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      Irregular
                    </button>
                  </div>
                </FieldRow>

                <FieldRow label="Embarazo reciente">
                  <div className="flex gap-2 flex-wrap justify-end">
                    {PREGNANCY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update({ recentPregnancy: formData.recentPregnancy === opt.value ? null : opt.value })}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                          formData.recentPregnancy === opt.value
                            ? 'bg-brand-navy text-white border-brand-navy shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => update({ recentPregnancy: null })}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                        formData.recentPregnancy === null
                          ? 'bg-slate-600 text-white border-slate-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </FieldRow>
                <FieldRow label="ACV previo">
                  <YesNoToggle value={formData.priorStroke} onChange={v => update({ priorStroke: v })} />
                </FieldRow>
                <FieldRow label="Traumatismo craneal reciente">
                  <YesNoToggle value={formData.recentCranialTrauma} onChange={v => update({ recentCranialTrauma: v })} />
                </FieldRow>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Módulo 3: Síntomas BE-FAST ── */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <Card className="shadow-sm border-slate-200/60">
              <CardHeader>
                <CardTitle>Módulo 3 · Síntomas BE-FAST</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-xs text-slate-500 font-medium mb-3">
                  Al menos un <span className="font-bold text-brand-navy">"Sí"</span> es necesario para habilitar el Código ACV.
                </p>

                {BEFAST_QUESTIONS.map(q => {
                  return (
                    <FieldRow key={q.id} label={q.label}>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              symptoms: [
                                ...prev.symptoms.filter(s => s !== q.id && s !== q.id + ':no'),
                                q.id,
                              ],
                            }));
                          }}
                          className={`px-5 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                            formData.symptoms.includes(q.id)
                              ? 'bg-brand-navy text-white border-brand-navy shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              symptoms: [
                                ...prev.symptoms.filter(s => s !== q.id && s !== q.id + ':no'),
                                q.id + ':no',
                              ],
                            }));
                          }}
                          className={`px-5 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                            formData.symptoms.includes(q.id + ':no')
                              ? 'bg-slate-600 text-white border-slate-600 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </FieldRow>
                  );
                })}

                <div className="pt-4 space-y-4 border-t border-slate-100 mt-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700">Fecha y Hora Inicio de Síntomas</label>
                    <TimePicker
                      value={formData.symptomOnsetTime}
                      onChange={val => update({ symptomOnsetTime: val })}
                    />
                  </div>

                  <Input
                    label="Contacto de Familiar (Teléfono)"
                    placeholder="Ej: 11 1234-5678"
                    value={formData.contactInfo}
                    onChange={e => update({ contactInfo: e.target.value })}
                  />
                  <Textarea
                    label="Observaciones Clínicas"
                    placeholder="Breve descripción del estado del paciente..."
                    value={formData.clinicalObservations}
                    onChange={e => update({ clinicalObservations: e.target.value })}
                  />
                </div>

                {/* ── Ubicación ── */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      {isLocating
                        ? <Loader2 className="w-5 h-5 text-slate-400 shrink-0 mt-0.5 animate-spin" />
                        : <MapPin className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                      }
                      <div className="flex-1 w-full min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="text-sm font-semibold text-slate-700">Ubicación (Georreferenciación)</p>
                          <Button
                            type="button" variant="ghost" size="sm"
                            className="h-6 px-2 text-xs text-slate-500 hover:text-slate-900 shrink-0"
                            onClick={() => getLocation(true)} disabled={isLocating}
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
                              onChange={e => setSearchAddress(e.target.value)}
                              onFocus={() => { if (searchAddress.trim().length >= 3) setShowSuggestions(true); }}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleManualSearch(); } }}
                              className="flex-1 rounded-xl"
                            />
                            <Button
                              type="button" variant="secondary"
                              onClick={handleManualSearch}
                              disabled={isSearching || !searchAddress.trim()}
                              className="rounded-xl"
                            >
                              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            </Button>
                          </div>

                          {showSuggestions && searchAddress.trim().length >= 3 && (
                            <div
                              ref={suggestionsRef}
                              className="absolute top-[42px] left-0 right-[52px] bg-white border border-slate-200 rounded-xl shadow-xl z-[2000] max-h-[200px] overflow-y-auto animate-in zoom-in-95 duration-200"
                            >
                              {isFetchingSuggestions && (
                                <div className="px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Buscando sugerencias...
                                </div>
                              )}
                              {!isFetchingSuggestions && suggestions.length === 0 && (
                                <div className="px-4 py-3 text-xs text-slate-500">No se encontraron sugerencias.</div>
                              )}
                              {!isFetchingSuggestions && suggestions.map(item => (
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
                          <p className="text-xs text-slate-400 mt-1 font-mono">
                            Lat: {formData.location.lat.toFixed(6)}, Lng: {formData.location.lng.toFixed(6)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="h-[200px] w-full rounded-xl overflow-hidden border border-slate-200 relative z-0 shadow-inner bg-slate-100">
                      {googleMapsApiKey && isGoogleMapsLoaded ? (
                        <GoogleMap
                          mapContainerStyle={{ height: '100%', width: '100%' }}
                          center={{ lat: formData.location.lat, lng: formData.location.lng }}
                          zoom={15}
                          onLoad={map => setMapRef(map)}
                          options={{ disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy' }}
                        >
                          <MarkerF position={{ lat: formData.location.lat, lng: formData.location.lng }} />
                          {nearestHospital && (
                            <MarkerF
                              position={{ lat: nearestHospital.location.lat, lng: nearestHospital.location.lng }}
                              icon="https://maps.google.com/mapfiles/ms/icons/green-dot.png"
                            />
                          )}
                          {routePath && (
                            <PolylineF
                              path={routePath}
                              options={{ strokeColor: '#16a34a', strokeOpacity: 0.85, strokeWeight: 4 }}
                            />
                          )}
                        </GoogleMap>
                      ) : (
                        <div className="h-full w-full grid place-items-center text-xs text-slate-500">
                          {googleMapsApiKey ? 'Cargando mapa...' : 'Falta VITE_GOOGLE_MAPS_API_KEY para mostrar el mapa'}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      {isCalculatingNearestRoute ? (
                        <p className="text-xs text-slate-600 flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Calculando hospital más cercano por ruta...
                        </p>
                      ) : nearestHospital && nearestRoute ? (
                        <div className="text-xs text-slate-700 space-y-1.5">
                          <p className="font-semibold text-slate-900">Ruta recomendada automática</p>
                          <p>{nearestHospital.name}</p>
                          <p className="flex items-center gap-2 text-slate-600">
                            <Clock className="w-3.5 h-3.5" />
                            ETA: {formatDuration(nearestRoute.totalDurationSeconds)} | Distancia: {formatDistance(nearestRoute.totalDistanceMeters)}
                          </p>
                        </div>
                      ) : nearestRouteError ? (
                        <p className="text-xs text-amber-700">{nearestRouteError}</p>
                      ) : (
                        <p className="text-xs text-slate-500">Esperando ubicación para calcular la ruta más cercana.</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Criteria banner + Submit ── */}
          <div className="pt-2 space-y-4">
            {/* Criteria status */}
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
              qualifiesForCode
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              {qualifiesForCode
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                : <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              }
              <div>
                <p className={`font-bold text-sm ${qualifiesForCode ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {qualifiesForCode ? 'Cumple criterios — se generará Código ACV' : 'No cumple criterios para Código ACV'}
                </p>
                <ul className="text-xs mt-1 space-y-0.5">
                  <li className={meetsAgeCriteria ? 'text-emerald-700' : 'text-amber-700'}>
                    {meetsAgeCriteria ? '✓' : '✗'} Edad ≥ 18 años
                    {!meetsAgeCriteria && ageEntered && ` (ingresada: ${formData.age})`}
                  </li>
                  <li className={meetsSymptomCriteria ? 'text-emerald-700' : 'text-amber-700'}>
                    {meetsSymptomCriteria ? '✓' : '✗'} Al menos un síntoma BE-FAST positivo
                  </li>
                </ul>
                {!qualifiesForCode && (
                  <p className="text-xs text-amber-600 mt-2">
                    El caso se registrará pero no generará código ACV ni enviará notificaciones.
                  </p>
                )}
              </div>
            </div>

            {submitBlockReason && (
              <p className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
                <Loader2 className={`w-3.5 h-3.5 ${!isHospitalReady && isPatientDataComplete ? 'animate-spin' : 'hidden'}`} />
                {submitBlockReason}
              </p>
            )}

            <Button
              type="submit"
              variant="default"
              size="xl"
              className={`w-full text-lg uppercase tracking-wider shadow-md transition-all ${
                !canSubmit
                  ? 'opacity-50 cursor-not-allowed'
                  : qualifiesForCode
                  ? 'shadow-brand-navy/20'
                  : 'bg-slate-600 hover:bg-slate-700 shadow-slate-400/20 border-0 text-white'
              }`}
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : qualifiesForCode ? (
                <>
                  <AlertCircle className="w-6 h-6 mr-2" />
                  Declarar Código ACV
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6 mr-2" />
                  Registrar Caso (sin código)
                </>
              )}
            </Button>

            {isSubmitting && (
              <p className="text-center text-sm text-slate-500 animate-pulse">
                {qualifiesForCode
                  ? 'Calculando ruta óptima y enviando notificaciones...'
                  : 'Registrando caso...'}
              </p>
            )}
          </div>
        </form>
      </main>
    </motion.div>
  );
}
