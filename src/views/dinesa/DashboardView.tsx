import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { 
  Activity, 
  Clock, 
  Hospital, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  Zap, 
  Timer, 
  ArrowRightLeft, 
  CheckCircle2,
  Stethoscope
} from 'lucide-react';
import { AcvCase } from '../../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface DashboardViewProps {
  cases: AcvCase[];
}

export function DashboardView({ cases }: DashboardViewProps) {
  // Mock data for the requested KPIs
  const metrics = {
    avgAssignmentTime: 4.2,
    avgReceptionDelay: 8.5,
    avgDoorToCT: 22.0,
    avgDoorToNeedle: 45.0,
    totalCodesTriggered: 156,
    redirectionRate: 12.5,
    totalPatientsAdmitted: 142,
    totalThrombolysis: 38,
    totalThrombectomies: 12,
    reperfusionEligibilityRate: 32.0,
  };

  const chartData = [
    { name: 'Lun', casos: 12, aguja: 48 },
    { name: 'Mar', casos: 19, aguja: 42 },
    { name: 'Mie', casos: 15, aguja: 45 },
    { name: 'Jue', casos: 22, aguja: 38 },
    { name: 'Vie', casos: 30, aguja: 40 },
    { name: 'Sab', casos: 25, aguja: 52 },
    { name: 'Dom', casos: 18, aguja: 46 },
  ];

  const treatmentData = [
    { name: 'Trombolisis', value: metrics.totalThrombolysis, color: '#10b981' },
    { name: 'Trombectomía', value: metrics.totalThrombectomies, color: '#3b82f6' },
    { name: 'Otros', value: metrics.totalPatientsAdmitted - metrics.totalThrombolysis - metrics.totalThrombectomies, color: '#94a3b8' },
  ];

  return (
    <div className="flex-1 w-full p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard de Gestión ACV</h2>
          <p className="text-sm text-slate-500 font-medium">Panel de control de indicadores críticos y métricas de red en tiempo real.</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          SISTEMA ACTIVO • ACTUALIZADO: 13:25
        </div>
      </div>

      {/* KPI Grid - Balanced and substantial */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard 
          title="Códigos ACV" 
          value={metrics.totalCodesTriggered} 
          icon={<Zap className="w-4 h-4 text-amber-500" />}
          trend="+8%"
          description="Activaciones totales"
        />
        <KpiCard 
          title="Pacientes Ingresados" 
          value={metrics.totalPatientsAdmitted} 
          icon={<Users className="w-4 h-4 text-blue-500" />}
          trend="+5%"
          description="Efectivos en guardia"
        />
        <KpiCard 
          title="Trombolisis" 
          value={metrics.totalThrombolysis} 
          icon={<Activity className="w-4 h-4 text-emerald-500" />}
          trend="+12%"
          description="Trat. Fibrinolíticos"
        />
        <KpiCard 
          title="Trombectomías" 
          value={metrics.totalThrombectomies} 
          icon={<Stethoscope className="w-4 h-4 text-indigo-500" />}
          trend="+2"
          description="Proc. Endovasculares"
        />
        <KpiCard 
          title="Elegibilidad" 
          value={`${metrics.reperfusionEligibilityRate}%`} 
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          trend="+3%"
          description="Pertinencia de red"
        />
        
        <KpiCard 
          title="Disparo - Asignación" 
          value={`${metrics.avgAssignmentTime}'`} 
          icon={<Timer className="w-4 h-4 text-red-500" />}
          trend="-0.4'"
          description="Respuesta Coordinación"
          isTime
        />
        <KpiCard 
          title="Delay Recepción" 
          value={`${metrics.avgReceptionDelay}'`} 
          icon={<Clock className="w-4 h-4 text-orange-500" />}
          trend="+1.2'"
          description="Bache Arribo-Triage"
          isTime
        />
        <KpiCard 
          title="Tiempo Puerta - TC" 
          value={`${metrics.avgDoorToCT}'`} 
          icon={<Activity className="w-4 h-4 text-blue-600" />}
          trend="-2.0'"
          description="Ingreso a Tomografía"
          isTime
        />
        <KpiCard 
          title="Tiempo Puerta - Aguja" 
          value={`${metrics.avgDoorToNeedle}'`} 
          icon={<Zap className="w-4 h-4 text-emerald-600" />}
          trend="-5.0'"
          description="Ingreso a Tratamiento"
          isTime
        />
        <KpiCard 
          title="Tasa Redirección" 
          value={`${metrics.redirectionRate}%`} 
          icon={<ArrowRightLeft className="w-4 h-4 text-amber-600" />}
          trend="-1%"
          description="Efectividad Cercanía"
        />
      </div>

      {/* Charts Row - Sized to fill 75-80% of height */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 border-slate-200 shadow-md overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest">
              <TrendingUp className="w-4 h-4 text-blue-500" /> Histórico Semanal: Casos vs Tiempos de Respuesta
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[380px] p-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="casos" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 7, strokeWidth: 0 }}
                  name="Casos Totales"
                />
                <Line 
                  type="monotone" 
                  dataKey="aguja" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 7, strokeWidth: 0 }}
                  name="T. Aguja (min)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-md flex flex-col">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-widest">Mix de Tratamientos</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-6 flex flex-col items-center justify-center">
            <div className="relative w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={treatmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={6}
                    dataKey="value"
                  >
                    {treatmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900">{metrics.totalPatientsAdmitted}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
              </div>
            </div>
            <div className="w-full space-y-2 mt-6">
              {treatmentData.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.name === 'Trombolisis' ? 'bg-emerald-500' : item.name === 'Trombectomía' ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
                    <span className="text-xs font-bold text-slate-600">{item.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-black text-slate-900">{item.value}</span>
                    <span className="text-[10px] text-slate-400 font-medium">({Math.round(item.value / metrics.totalPatientsAdmitted * 100)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ 
  title, 
  value, 
  icon, 
  trend, 
  description, 
  isTime = false 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  trend: string; 
  description: string;
  isTime?: boolean;
}) {
  return (
    <Card className="border-slate-200 hover:border-blue-400 transition-all shadow-sm hover:shadow-lg group overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
          <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
            {icon}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-black text-slate-900 leading-none tracking-tighter">{value}</div>
          <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {trend}
          </div>
        </div>
        <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-tight">{description}</p>
      </div>
      <div className={`h-1 w-full ${trend.startsWith('+') ? 'bg-emerald-500' : 'bg-red-500'} opacity-10`}></div>
    </Card>
  );
}
