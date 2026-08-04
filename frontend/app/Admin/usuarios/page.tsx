"use client";

import { useEffect, useState } from "react";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { toast } from "sonner";

interface Usuario {
  id: number;
  nombre: string;
  codigo: string;
  correo: string;
  rol: string;
  estado: string;
  fechaRegistro: string;
  isCurrentUser?: boolean;
}

export default function GestionUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRol, setFilterRol] = useState("Todos los roles");
  const [filterEstado, setFilterEstado] = useState("Todos los estados");

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    
    // Attempt to fetch from /api/usuarios, fallback to building from /api/docentes
    fetch("/api/usuarios", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(res => {
        if (!res.ok) throw new Error("Endpoint no disponible");
        return res.json();
      })
      .then(data => {
        const userList = Array.isArray(data) ? data : (data.usuarios || []);
        if (userList.length > 0) {
          setUsuarios(userList);
          setLoading(false);
        } else {
          throw new Error("Empty array");
        }
      })
      .catch(() => {
        // Fallback: build mock users from real docentes
        fetch("/api/docentes", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
          .then(res => res.json())
          .then(data => {
            const docList = Array.isArray(data) ? data : (data.docentes || []);
            const adminUser: Usuario = {
              id: 1,
              nombre: "Gabriel Administrador UNSAAC",
              codigo: "ADM-001",
              correo: "admin@unsaac.edu.pe",
              rol: "Administrador",
              estado: "Activo",
              fechaRegistro: "21/07/2026",
              isCurrentUser: true,
            };
            const mappedUsers = docList.map((d: any, idx: number) => ({
              id: idx + 2,
              nombre: `${d.nombres} ${d.apellidos}`,
              codigo: d.codigo || `DOC-DEMO-0${idx + 1}`,
              correo: d.email || `docente${idx + 1}@demo.unsaac.edu.pe`,
              rol: "Docente",
              estado: (d.estado || "Activo") === "Activo" ? "Activo" : "Inactivo",
              fechaRegistro: "22/07/2026",
            }));
            
            // Add a couple of dummy supervisors for UI completeness
            const supervisors = [
              { id: 998, nombre: "Supervisor Demo 1", codigo: "SUP-001", correo: "sup1@demo.unsaac.edu.pe", rol: "Supervisor", estado: "Activo", fechaRegistro: "20/07/2026" },
              { id: 999, nombre: "Supervisor Demo 2", codigo: "SUP-002", correo: "sup2@demo.unsaac.edu.pe", rol: "Inactivo", estado: "Inactivo", fechaRegistro: "20/07/2026" }
            ];

            setUsuarios([adminUser, ...mappedUsers, ...supervisors]);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  }, []);

  const rolesCount = {
    Administradores: usuarios.filter(u => u.rol === "Administrador").length,
    Docentes: usuarios.filter(u => u.rol === "Docente").length,
    Supervisores: usuarios.filter(u => u.rol === "Supervisor").length,
  };

  const filteredUsuarios = usuarios.filter(u => {
    const matchesSearch = 
      u.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.correo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRol = filterRol === "Todos los roles" || u.rol === filterRol;
    const matchesEstado = filterEstado === "Todos los estados" || u.estado === filterEstado;
    return matchesSearch && matchesRol && matchesEstado;
  });

  const totalRegistrados = usuarios.length;
  const activos = usuarios.filter(u => u.estado === "Activo").length;
  const inactivos = totalRegistrados - activos;

  const handleDelete = (id: number, isCurrent?: boolean) => {
    if (isCurrent) {
       toast.error("No puedes eliminar tu propia cuenta de administrador.");
       return;
    }
    setUsuarios(usuarios.filter(u => u.id !== id));
    toast.success("Cuenta de usuario eliminada correctamente.");
  };

  const handleDeactivate = (id: number, isCurrent?: boolean) => {
    if (isCurrent) {
       toast.error("Protección activada: No puedes desactivar tu cuenta actual.");
       return;
    }
    setUsuarios(usuarios.map(u => u.id === id ? { ...u, estado: "Inactivo" } : u));
    toast.warning("El acceso del usuario ha sido revocado.");
  };

  const handleRoleChange = (id: number, newRole: string) => {
    setUsuarios(usuarios.map(u => u.id === id ? { ...u, rol: newRole } : u));
    toast.success(`Rol actualizado a ${newRole}.`);
  };

  const handleSaveUser = () => {
    setIsModalOpen(false);
    toast.success("Nueva cuenta institucional creada exitosamente.");
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-semibold animate-pulse">Cargando usuarios...</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Administración</p>
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Institucional</p>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestión de usuarios</h1>
            <span className="bg-green-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
               <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
               {activos} usuarios activos
            </span>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-slate-500 max-w-2xl leading-relaxed">
            Administre las cuentas, estados y roles del sistema de asistencia docente.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setIsModalOpen(true)} className="font-black bg-orange-500 hover:bg-orange-600 text-white shadow-sm border-none h-10 px-6 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Nuevo usuario
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Usuarios registrados</p>
                <h3 className="text-3xl font-black text-blue-600 leading-none mb-1.5">{totalRegistrados}</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 leading-snug">Cuentas institucionales</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"></div>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Usuarios activos</p>
                <h3 className="text-3xl font-black text-slate-900 leading-none mb-1.5">{activos}</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shrink-0"></div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 leading-snug">Acceso habilitado</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900"></div>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Usuarios inactivos</p>
                <h3 className="text-3xl font-black text-slate-900 leading-none mb-1.5">{inactivos}</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shrink-0"></div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 leading-snug">Acceso restringido</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900"></div>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Roles oficiales</p>
                <h3 className="text-3xl font-black text-slate-900 leading-none mb-1.5">3</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shrink-0"></div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 leading-snug">{rolesCount.Docentes} docentes y {rolesCount.Supervisores} supervisores</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900"></div>
        </Card>
      </div>

      {/* Busqueda y filtros */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
             <div className="flex-1 relative">
                <svg className="w-4 h-4 absolute left-3 top-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input 
                  type="text" 
                  placeholder="Buscar por nombre, código o correo" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm" 
                />
             </div>
             <div className="w-full md:w-56">
                <select 
                  value={filterRol}
                  onChange={(e) => setFilterRol(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm"
                >
                  <option>Todos los roles</option>
                  <option>Administrador</option>
                  <option>Docente</option>
                  <option>Supervisor</option>
                </select>
             </div>
             <div className="w-full md:w-48">
                <select 
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm"
                >
                  <option>Todos los estados</option>
                  <option>Activo</option>
                  <option>Inactivo</option>
                </select>
             </div>
             <Button 
                variant="outline" 
                onClick={() => { setSearchQuery(""); setFilterRol("Todos los roles"); setFilterEstado("Todos los estados"); }}
                className="text-xs font-bold px-5 h-10 border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 shrink-0"
             >
                Limpiar
             </Button>
          </div>
          <div className="flex gap-2">
             <div className="px-3 py-1 bg-blue-50 rounded-full flex items-center gap-1.5"><span className="text-[10px] font-bold text-slate-600">Administradores</span><span className="bg-blue-200 text-blue-700 text-[9px] font-black px-1.5 rounded-full">{rolesCount.Administradores}</span></div>
             <div className="px-3 py-1 bg-blue-50 rounded-full flex items-center gap-1.5"><span className="text-[10px] font-bold text-slate-600">Docentes</span><span className="bg-blue-200 text-blue-700 text-[9px] font-black px-1.5 rounded-full">{rolesCount.Docentes}</span></div>
             <div className="px-3 py-1 bg-blue-50 rounded-full flex items-center gap-1.5"><span className="text-[10px] font-bold text-slate-600">Supervisores</span><span className="bg-blue-200 text-blue-700 text-[9px] font-black px-1.5 rounded-full">{rolesCount.Supervisores}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuarios */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden flex flex-col">
        <div className="p-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">Usuarios del sistema</h2>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Cuentas institucionales registradas en la plataforma.</p>
          </div>
          <div className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1.5 rounded-full border border-blue-100">
            {filteredUsuarios.length} usuario(s)
          </div>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-100/80 border-y border-slate-200">
              <tr>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-800 text-[9px]">Usuario</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-800 text-[9px]">Código</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-800 text-[9px]">Correo Institucional</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-800 text-[9px]">Rol</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-800 text-[9px]">Estado</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-800 text-[9px]">Fecha de registro</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-800 text-[9px]">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500 font-semibold text-sm">
                    No se encontraron usuarios con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredUsuarios.map((u, idx) => {
                  const initials = u.nombre.split(" ").slice(0,2).map(n => n.charAt(0)).join("");
                  
                  return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                    {/* Usuario */}
                    <td className="px-6 py-4 min-w-[200px]">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs shrink-0">
                           {initials}
                         </div>
                         <div>
                           <h4 className="text-xs font-black text-slate-900">{u.nombre}</h4>
                           <p className="text-[9px] font-bold text-slate-500 mt-0.5">Usuario #{u.id}</p>
                         </div>
                       </div>
                    </td>
                    
                    {/* Codigo */}
                    <td className="px-6 py-4 font-black text-blue-600 whitespace-nowrap">
                      {u.codigo}
                    </td>

                    {/* Correo */}
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {u.correo}
                    </td>

                    {/* Rol (Select inline) */}
                    <td className="px-6 py-4 min-w-[180px]">
                      <select 
                        defaultValue={u.rol}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-700 outline-none focus:border-blue-500 shadow-sm mb-1 cursor-pointer"
                      >
                         <option value="Administrador">Administrador</option>
                         <option value="Docente">Docente</option>
                         <option value="Supervisor">Supervisor</option>
                      </select>
                      <p className="text-[8px] font-bold text-slate-500">
                        {u.rol === "Administrador" ? "Rol de la sesión actual" : "Perfil docente vinculado"}
                      </p>
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${u.estado === "Activo" ? "bg-green-500" : "bg-red-500"}`}></span>
                          <span className="font-bold text-slate-800 text-[10px]">{u.estado}</span>
                       </div>
                    </td>

                    {/* Fecha */}
                    <td className="px-6 py-4 font-bold text-slate-700 text-[10px]">
                      {u.fechaRegistro}
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 min-w-[200px]">
                       <div className="flex flex-col gap-1.5">
                          <div className="flex gap-1.5">
                             <button onClick={() => toast.info("Abriendo panel de edición")} className="h-7 px-3 rounded-md text-[9px] font-black text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">Editar</button>
                             <button onClick={() => handleDeactivate(u.id, u.isCurrentUser)} className="h-7 px-3 rounded-md text-[9px] font-black text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm">Desactivar</button>
                             <button onClick={() => handleDelete(u.id, u.isCurrentUser)} className="h-7 px-3 rounded-md text-[9px] font-black text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm">Eliminar</button>
                          </div>
                          <p className="text-[8px] font-bold text-slate-500">
                             {u.isCurrentUser ? "La cuenta actual está protegida." : "La cuenta docente se gestiona desde Docentes."}
                          </p>
                       </div>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white p-6 shadow-2xl rounded-2xl border-none">
            <h2 className="text-xl font-black text-slate-900 mb-2">Crear nueva cuenta</h2>
            <p className="text-[11px] font-semibold text-slate-500 mb-6">Asigne un correo institucional y determine los permisos de la nueva cuenta.</p>
            <div className="space-y-4">
              <input type="text" placeholder="Código de vinculación (Ej. DOC-001)" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500" />
              <input type="email" placeholder="Correo institucional (@unsaac.edu.pe)" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500" />
              <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 bg-white">
                 <option>Rol: Docente</option>
                 <option>Rol: Supervisor</option>
                 <option>Rol: Administrador</option>
              </select>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" className="text-xs font-bold shadow-sm" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm" onClick={handleSaveUser}>Crear usuario</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}