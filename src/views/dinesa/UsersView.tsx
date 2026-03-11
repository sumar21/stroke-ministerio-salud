import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { User } from '../../types';
import { mockUsers } from '../../data/mockUsers';
import { Plus, Edit2, Trash2, User as UserIcon, Shield, Key } from 'lucide-react';

export function UsersView() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User> | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const handleEdit = (user: User) => {
    setCurrentUser(user);
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setCurrentUser({
      id: `u${Date.now()}`,
      firstName: '',
      lastName: '',
      username: '',
      password: '',
      role: 'AMBULANCE'
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (currentUser && currentUser.id) {
      const exists = users.find(u => u.id === currentUser.id);
      if (exists) {
        setUsers(users.map(u => u.id === currentUser.id ? currentUser as User : u));
      } else {
        setUsers([...users, currentUser as User]);
      }
      setIsEditing(false);
      setCurrentUser(null);
    }
  };

  const handleDelete = (id: string) => {
    setUserToDelete(id);
    setIsDeleting(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      setUsers(users.filter(u => u.id !== userToDelete));
      setUserToDelete(null);
    }
  };

  return (
    <div className="flex-1 w-full p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Usuarios</h2>
          <p className="text-sm text-slate-500 font-medium">Administración de accesos, roles y permisos del sistema.</p>
        </div>
        {!isEditing && (
          <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 shadow-sm rounded-xl px-6">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Usuario
          </Button>
        )}
      </div>

      <ConfirmModal
        isOpen={isDeleting}
        onClose={() => {
          setIsDeleting(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Eliminar Usuario"
        message={`¿Estás seguro de que deseas eliminar al usuario "${users.find(u => u.id === userToDelete)?.username}"?`}
        confirmText="Eliminar"
      />

      <Modal
        isOpen={isEditing && !!currentUser}
        onClose={() => setIsEditing(false)}
        title={currentUser?.firstName ? 'Editar Perfil de Usuario' : 'Registrar Nuevo Usuario'}
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="outline" className="rounded-xl px-6" onClick={() => setIsEditing(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 shadow-md rounded-xl px-8">Guardar Cambios</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre</label>
              <Input 
                className="rounded-xl border-slate-200 focus:ring-blue-500 h-9 text-sm"
                value={currentUser?.firstName || ''} 
                onChange={e => setCurrentUser({...currentUser!, firstName: e.target.value})}
                placeholder="Ej: Juan"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Apellido</label>
              <Input 
                className="rounded-xl border-slate-200 focus:ring-blue-500 h-9 text-sm"
                value={currentUser?.lastName || ''} 
                onChange={e => setCurrentUser({...currentUser!, lastName: e.target.value})}
                placeholder="Ej: Pérez"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre de Usuario</label>
              <Input 
                className="rounded-xl border-slate-200 focus:ring-blue-500 h-9 text-sm"
                value={currentUser?.username || ''} 
                onChange={e => setCurrentUser({...currentUser!, username: e.target.value})}
                placeholder="jperez"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contraseña</label>
              <div className="relative">
                <Input 
                  className="rounded-xl border-slate-200 focus:ring-blue-500 h-9 text-sm"
                  type="password"
                  value={currentUser?.password || ''} 
                  onChange={e => setCurrentUser({...currentUser!, password: e.target.value})}
                  placeholder="••••••••"
                />
                <Key className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol Asignado</label>
              <select 
                className="w-full h-9 px-3 py-1 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={currentUser?.role || 'AMBULANCE'}
                onChange={e => setCurrentUser({...currentUser!, role: e.target.value as any})}
              >
                <option value="AMBULANCE">Ambulancia (Carga)</option>
                <option value="DINESA">DINESA (Gestión)</option>
                <option value="HOSPITAL">Hospital (Recepción)</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      <Card className="border-slate-200 shadow-md overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-5">Identidad / Usuario</th>
                  <th className="px-6 py-5">Nombre Completo</th>
                  <th className="px-6 py-5">Rol del Sistema</th>
                  <th className="px-6 py-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-black uppercase border border-slate-200 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{user.username}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-slate-600 font-medium">{user.firstName} {user.lastName}</div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        user.role === 'DINESA' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                        user.role === 'AMBULANCE' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                        'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        <Shield className="w-3 h-3" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(user)} className="h-8 w-8 p-0 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)} className="h-8 w-8 p-0 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50">
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
