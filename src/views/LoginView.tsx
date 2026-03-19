import React from 'react';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Role } from '../types';
import { Ambulance, Monitor, Activity, ShieldCheck, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import { images } from '../images';

interface LoginViewProps {
  onLogin: (role: Role) => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-b from-brand-navy/5 to-transparent -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <div className="flex items-center justify-center mb-10">
          <img
            src={images.ministerioSalud}
            alt="Ministerio de Salud - Presidencia de la Nación"
            className="h-28 md:h-32 object-contain drop-shadow-sm"
            referrerPolicy="no-referrer"
          />
        </div>

        <Card className="w-full border-slate-100 shadow-2xl shadow-slate-200/50 rounded-3xl bg-white/90 backdrop-blur-xl overflow-hidden">
          <CardHeader className="text-center pb-8 pt-10 px-8">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 bg-brand-navy/10 text-brand-navy rounded-full flex items-center justify-center mb-6 shadow-sm border border-brand-navy/20"
            >
              <Activity className="w-10 h-10" />
            </motion.div>
            <CardTitle className="text-3xl font-bold text-slate-900 tracking-tight">Stroke App</CardTitle>
            <p className="text-slate-500 mt-3 text-sm leading-relaxed">
              Sistema Nacional de Gestión y Derivación de Accidentes Cerebrovasculares
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-5 md:px-8 pb-10">
            <Button 
              size="xl" 
              className="w-full justify-start gap-3 md:gap-4 text-left bg-brand-navy hover:bg-brand-navy/90 text-white border-0 shadow-lg shadow-brand-navy/20 rounded-2xl min-h-20 h-auto py-3 transition-all hover:scale-[1.02] hover:shadow-brand-navy/30 group"
              onClick={() => onLogin('AMBULANCE')}
            >
              <div className="bg-white/20 p-3 rounded-xl group-hover:bg-white/30 transition-colors">
                <Ambulance className="w-7 h-7 text-white" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-base md:text-lg tracking-tight">Prehospitalario</span>
                <span className="text-xs md:text-sm font-medium text-white/70">Ambulancia / SAME</span>
              </div>
            </Button>
            
            <Button 
              size="xl" 
              variant="outline"
              className="w-full justify-start gap-3 md:gap-4 text-left border-slate-200 hover:border-brand-gold/50 hover:bg-brand-gold/10 text-slate-700 rounded-2xl min-h-20 h-auto py-3 transition-all hover:scale-[1.02] hover:shadow-md hover:shadow-brand-gold/20 group"
              onClick={() => onLogin('COORDINATION')}
            >
              <div className="bg-slate-100 p-3 rounded-xl text-slate-500 group-hover:bg-brand-gold/20 group-hover:text-brand-navy transition-colors">
                <Building2 className="w-7 h-7" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-base md:text-lg tracking-tight">Centro Stroke (Hospital)</span>
                <span className="text-xs md:text-sm font-medium text-slate-500 group-hover:text-brand-navy/70 transition-colors">Confirma y reasigna hospital</span>
              </div>
            </Button>

            <Button 
              size="xl" 
              variant="outline"
              className="w-full justify-start gap-3 md:gap-4 text-left border-slate-200 hover:border-brand-blue/50 hover:bg-brand-blue/10 text-slate-700 rounded-2xl min-h-20 h-auto py-3 transition-all hover:scale-[1.02] hover:shadow-md hover:shadow-brand-blue/20 group"
              onClick={() => onLogin('DINESA')}
            >
              <div className="bg-slate-100 p-3 rounded-xl text-slate-500 group-hover:bg-brand-blue/20 group-hover:text-brand-navy transition-colors">
                <Monitor className="w-7 h-7" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-base md:text-lg tracking-tight">Centro Coordinador Nacional</span>
                <span className="text-xs md:text-sm font-medium text-slate-500 group-hover:text-brand-navy/70 transition-colors">DINESA</span>
              </div>
            </Button>

            <Button 
              size="xl" 
              variant="outline"
              className="w-full justify-start gap-3 md:gap-4 text-left border-slate-200 hover:border-brand-navy/30 hover:bg-brand-navy/5 text-slate-700 rounded-2xl min-h-20 h-auto py-3 transition-all hover:scale-[1.02] hover:shadow-md hover:shadow-brand-navy/10 group"
              onClick={() => onLogin('ADMIN')}
            >
              <div className="bg-slate-100 p-3 rounded-xl text-slate-500 group-hover:bg-brand-navy/10 group-hover:text-brand-navy transition-colors">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-base md:text-lg tracking-tight">Administrador</span>
                <span className="text-xs md:text-sm font-medium text-slate-500 group-hover:text-brand-navy/70 transition-colors">ABM de hospitales y usuarios</span>
              </div>
            </Button>
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-4"
        >
          <p className="text-xs text-slate-400 font-medium">Dirección Nacional de Emergencias Sanitarias (DINESA)</p>
          <p className="text-[10px] text-slate-300 mt-1 font-mono tracking-wide">v20260319.1.0.1 DEMO</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
