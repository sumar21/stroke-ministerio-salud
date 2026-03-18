import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { OperativeCenter } from '../../types';
import { mockOperativeCenters } from '../../data/mockOperativeCenters';
import { Plus, Edit2, Trash2, Radio, Mail, Phone } from 'lucide-react';

export function OperativeCentersView() {
  const [centers, setCenters] = useState<OperativeCenter[]>(mockOperativeCenters);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentCenter, setCurrentCenter] = useState<Partial<OperativeCenter> | null>(null);
  const [centerToDelete, setCenterToDelete] = useState<string | null>(null);

  const handleEdit = (center: OperativeCenter) => {
    setCurrentCenter(center);
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setCurrentCenter({ id: `oc${Date.now()}`, name: '', email: '', phone: '' });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (currentCenter && currentCenter.id) {
      const exists = centers.find(c => c.id === currentCenter.id);
      if (exists) {
        setCenters(centers.map(c => c.id === currentCenter.id ? currentCenter as OperativeCenter : c));
      } else {
        setCenters([...centers, currentCenter as OperativeCenter]);
      }
      setIsEditing(false);
      setCurrentCenter(null);
    }
  };

  const handleDelete = (id: string) => {
    setCenterToDelete(id);
    setIsDeleting(true);
  };

  const confirmDelete = () => {
    if (centerToDelete) {
      setCenters(centers.filter(c => c.id !== centerToDelete));
      setCenterToDelete(null);
    }
  };

  return (
    <div className="flex-1 w-full p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Centros Operativos</h2>
          <p className="text-sm text-slate-500 font-medium">Administración de centros operativos y de coordinación de la red.</p>
        </div>
        <Button onClick={handleAddNew} className="bg-brand-navy hover:bg-brand-navy/90 shadow-sm rounded-xl px-6">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Centro
        </Button>
      </div>

      <ConfirmModal
        isOpen={isDeleting}
        onClose={() => { setIsDeleting(false); setCenterToDelete(null); }}
        onConfirm={confirmDelete}
        title="Eliminar Centro Operativo"
        message={`¿Estás seguro de que deseas eliminar "${centers.find(c => c.id === centerToDelete)?.name}"?`}
        confirmText="Eliminar"
      />

      <Modal
        isOpen={isEditing && !!currentCenter}
        onClose={() => setIsEditing(false)}
        title={currentCenter?.name ? 'Editar Centro Operativo' : 'Nuevo Centro Operativo'}
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="outline" className="rounded-xl px-6" onClick={() => setIsEditing(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-brand-navy hover:bg-brand-navy/90 shadow-md rounded-xl px-8">Guardar Cambios</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Centro</label>
            <Input
              className="rounded-xl border-slate-200 h-9 text-sm"
              value={currentCenter?.name || ''}
              onChange={e => setCurrentCenter({ ...currentCenter!, name: e.target.value })}
              placeholder="Ej: Centro Operativo SAME"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email de Contacto</label>
            <Input
              className="rounded-xl border-slate-200 h-9 text-sm"
              type="email"
              value={currentCenter?.email || ''}
              onChange={e => setCurrentCenter({ ...currentCenter!, email: e.target.value })}
              placeholder="contacto@organismo.gob.ar"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teléfono</label>
            <Input
              className="rounded-xl border-slate-200 h-9 text-sm"
              type="tel"
              value={currentCenter?.phone || ''}
              onChange={e => setCurrentCenter({ ...currentCenter!, phone: e.target.value })}
              placeholder="Ej: 0800-222-1002"
            />
          </div>
        </div>
      </Modal>

      <Card className="border-slate-200 shadow-md overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-5">Centro</th>
                <th className="px-6 py-5">Email</th>
                <th className="px-6 py-5">Teléfono</th>
                <th className="px-6 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {centers.map((center) => (
                <tr key={center.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-navy/10 text-brand-navy flex items-center justify-center border border-brand-navy/20 shrink-0">
                        <Radio className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{center.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">ID: {center.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {center.email || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {center.phone || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(center)} className="h-8 w-8 p-0 rounded-lg text-brand-navy hover:text-brand-navy hover:bg-brand-navy/10">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(center.id)} className="h-8 w-8 p-0 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {centers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-slate-400 text-sm font-medium">
                    No hay centros operativos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
