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
      <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-b from-red-600/5 to-transparent -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <div className="flex justify-center mb-10">
          <img 
            src={images.ministerioSalud} 
            alt="Ministerio de Salud - Presidencia de la Nación" 
            className="h-14 md:h-16 object-contain drop-shadow-sm" 
            referrerPolicy="no-referrer" 
          />
        </div>

        <Card className="w-full border-slate-100 shadow-2xl shadow-slate-200/50 rounded-3xl bg-white/90 backdrop-blur-xl overflow-hidden">
          <CardHeader className="text-center pb-8 pt-10 px-8">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100"
            >
              <Activity className="w-10 h-10" />
            </motion.div>
            <CardTitle className="text-3xl font-bold text-slate-900 tracking-tight">Código ACV</CardTitle>
            <p className="text-slate-500 mt-3 text-sm leading-relaxed">
              Sistema Nacional de Gestión y Derivación de Accidentes Cerebrovasculares
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-8 pb-10">
            <Button 
              size="xl" 
              className="w-full justify-start gap-4 text-left bg-red-600 hover:bg-red-700 text-white border-0 shadow-lg shadow-red-600/20 rounded-2xl h-20 transition-all hover:scale-[1.02] hover:shadow-red-600/30 group"
              onClick={() => onLogin('AMBULANCE')}
            >
              <div className="bg-white/20 p-3 rounded-xl group-hover:bg-white/30 transition-colors">
                <Ambulance className="w-7 h-7 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight">Prehospitalario</span>
                <span className="text-sm font-medium text-red-100">Ambulancia / SAME</span>
              </div>
            </Button>
            
            <Button 
              size="xl" 
              variant="outline"
              className="w-full justify-start gap-4 text-left border-slate-200 hover:border-orange-200 hover:bg-orange-50 text-slate-700 rounded-2xl h-20 transition-all hover:scale-[1.02] hover:shadow-md hover:shadow-orange-100/50 group"
              onClick={() => onLogin('COORDINATION')}
            >
              <div className="bg-slate-100 p-3 rounded-xl text-slate-500 group-hover:bg-orange-100 group-hover:text-orange-700 transition-colors">
                <Building2 className="w-7 h-7" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight">Coordinación Centro Stroke</span>
                <span className="text-sm font-medium text-slate-500 group-hover:text-orange-700/70 transition-colors">Confirma y reasigna hospital</span>
              </div>
            </Button>

            <Button 
              size="xl" 
              variant="outline"
              className="w-full justify-start gap-4 text-left border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-700 rounded-2xl h-20 transition-all hover:scale-[1.02] hover:shadow-md hover:shadow-red-100/50 group"
              onClick={() => onLogin('DINESA')}
            >
              <div className="bg-slate-100 p-3 rounded-xl text-slate-500 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                <Monitor className="w-7 h-7" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight">DINESA</span>
                <span className="text-sm font-medium text-slate-500 group-hover:text-red-600/70 transition-colors">Solo monitoreo de casos</span>
              </div>
            </Button>

            <Button 
              size="xl" 
              variant="outline"
              className="w-full justify-start gap-4 text-left border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-slate-700 rounded-2xl h-20 transition-all hover:scale-[1.02] hover:shadow-md hover:shadow-blue-100/50 group"
              onClick={() => onLogin('ADMIN')}
            >
              <div className="bg-slate-100 p-3 rounded-xl text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight">Administrador</span>
                <span className="text-sm font-medium text-slate-500 group-hover:text-blue-700/70 transition-colors">ABM de hospitales y usuarios</span>
              </div>
            </Button>
          </CardContent>
        </Card>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-slate-400 mt-8 font-medium"
        >
          Dirección Nacional de Emergencias Sanitarias (DINESA)
        </motion.p>
      </motion.div>
    </div>
  );
}
