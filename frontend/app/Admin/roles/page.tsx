"use client";

import { useState } from "react";
import Card, { CardContent } from "@/components/ui/Card";
import { toast } from "sonner";

const INITIAL_ROLES_DATA = [
  {
    id: "admin",
    codigo: "ROL-ADMIN",
    nombre: "Administrador",
    desc: "Gestión total del sistema",
    usuarios: 3,
    activos: 3,
    accesos: 8,
    identificador: 1,
    usersList: [
      { id: 1, iniciales: "GA", nombre: "Gabriel Administrador UNSAAC", codigo: "ADM-001", email: "admin@unsaac.edu.pe" },
      { id: 2, iniciales: "GR", nombre: "Gabriela Rios Mendoza", codigo: "ADM-DEMO-01", email: "admin.demo01@demo.unsaac.edu.pe" },
      { id: 3, iniciales: "CZ", nombre: "Carlos Zamora Paredes", codigo: "ADM-DEMO-02", email: "admin.demo02@demo.unsaac.edu.pe" }
    ],
    permisos: ["Panel principal", "Usuarios", "Roles", "Docentes", "Biometría", "Asistencia (Registro)", "Asistencia (Supervisar)", "Reportes", "Configuración"]
  },
  {
    id: "docente",
    codigo: "ROL-DOCENTE",
    nombre: "Docente",
    desc: "Registro y consulta de asistencia personal",
    usuarios: 24,
    activos: 22,
    accesos: 2,
    identificador: 2,
    usersList: [
      { id: 4, iniciales: "RA", nombre: "Rodrigo Aguilar Sucso", codigo: "DOC-DEMO-019", email: "docente19@demo.unsaac.edu.pe" },
      { id: 5, iniciales: "VC", nombre: "Valeria Cabrera Huillca", codigo: "DOC-DEMO-009", email: "docente09@demo.unsaac.edu.pe" },
      { id: 6, iniciales: "MC", nombre: "Mateo Cárdenas Huamán", codigo: "DOC-DEMO-002", email: "docente02@demo.unsaac.edu.pe" }
    ],
    permisos: ["Panel principal", "Asistencia (Registro)"]
  },
  {
    id: "supervisor",
    codigo: "ROL-SUPERVISOR",
    nombre: "Supervisor",
    desc: "Monitoreo académico por carrera",
    usuarios: 9,
    activos: 9,
    accesos: 3,
    identificador: 3,
    usersList: [
      { id: 7, iniciales: "SP", nombre: "Supervisor Pruebas 1", codigo: "SUP-001", email: "sup1@demo.unsaac.edu.pe" },
      { id: 8, iniciales: "SP", nombre: "Supervisor Pruebas 2", codigo: "SUP-002", email: "sup2@demo.unsaac.edu.pe" }
    ],
    permisos: ["Panel principal", "Asistencia (Supervisar)", "Reportes"]
  }
];

const PERMISOS_MATRIX = [
  { area: "Panel principal", action: "Consultar", desc: "Visualizar indicadores y el resumen institucional." },
  { area: "Usuarios", action: "Administrar", desc: "Crear, editar, activar, desactivar y asignar roles a las cuentas." },
  { area: "Roles", action: "Administrar", desc: "Consultar los roles oficiales y asignarlos a los usuarios." },
  { area: "Docentes", action: "Administrar", desc: "Gestionar el perfil institucional de los docentes." },
  { area: "Biometría", action: "Administrar", desc: "Gestionar capturas, dispositivos y sincronizaciones." },
  { area: "Asistencia (Registro)", areaDisplay: "Asistencia", action: "Registro personal", desc: "Registrar y consultar la asistencia propia." },
  { area: "Asistencia (Supervisar)", areaDisplay: "Asistencia", action: "Supervisar", desc: "Consultar marcaciones y cumplimiento docente." },
  { area: "Reportes", action: "Consultar", desc: "Visualizar reportes e indicadores institucionales." },
  { area: "Configuración", action: "Administrar", desc: "Modificar parámetros generales del sistema." }
];

export default function GestionRolesPage() {
  const [rolesData, setRolesData] = useState(INITIAL_ROLES_DATA);
  const [selectedRoleId, setSelectedRoleId] = useState("admin");
  
  const selectedRole = rolesData.find(r => r.id === selectedRoleId)!;

  const handleTogglePermission = (roleId: string, area: string) => {
     setRolesData(prev => prev.map(r => {
        if (r.id === roleId) {
           const hasPerm = r.permisos.includes(area);
           const newPerms = hasPerm ? r.permisos.filter(p => p !== area) : [...r.permisos, area];
           if (hasPerm) toast.warning(`Permiso "${area}" revocado para el rol ${r.nombre}.`);
           else toast.success(`Permiso "${area}" concedido al rol ${r.nombre}.`);
           
           return { ...r, permisos: newPerms, accesos: newPerms.length };
        }
        return r;
     }));
  };

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
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestión de roles</h1>
            <div className="bg-black w-20 h-6 rounded-full"></div>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-slate-500 max-w-2xl leading-relaxed">
            Consulte los roles oficiales, sus usuarios asignados y los accesos funcionales del sistema.
          </p>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative border-t-2 border-t-blue-600">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Roles del sistema</p>
                <h3 className="text-3xl font-black text-blue-600 leading-none mb-1.5">3</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 leading-snug">Roles definidos institucionalmente</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Usuarios asignados</p>
                <h3 className="text-3xl font-black text-slate-900 leading-none mb-1.5">36</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shrink-0"></div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 leading-snug">Cuentas con rol vigente</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900"></div>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Usuarios activos</p>
                <h3 className="text-3xl font-black text-slate-900 leading-none mb-1.5">34</h3>
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
                <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Accesos funcionales</p>
                <h3 className="text-3xl font-black text-slate-900 leading-none mb-1.5">9</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shrink-0"></div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 leading-snug">Acciones institucionales</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900"></div>
        </Card>
      </div>

      {/* Roles disponibles */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-black text-slate-900">Roles disponibles</h2>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Seleccione un rol para consultar su configuración y sus usuarios.</p>
          </div>
          <div className="bg-black text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm">
            Seleccionado: {selectedRole.nombre}
          </div>
        </div>
        <CardContent className="p-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {rolesData.map(role => {
                 const isSelected = selectedRoleId === role.id;
                 return (
                    <div 
                      key={role.id} 
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`border-2 rounded-2xl p-5 cursor-pointer transition-all flex flex-col justify-between min-h-[220px] ${
                        isSelected ? "border-blue-500 bg-blue-50/30 shadow-md" : "border-slate-200 hover:border-slate-300 bg-white shadow-sm"
                      }`}
                    >
                       <div>
                          <div className="flex justify-between items-start mb-3">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? "bg-black text-blue-500" : "bg-black text-white"}`}>
                                {isSelected ? (
                                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                ) : ""}
                             </div>
                             <div className="w-16 h-4 bg-black rounded-full"></div>
                          </div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{role.codigo}</p>
                          <h3 className="text-xl font-black text-slate-900 mb-1">{role.nombre}</h3>
                          <p className="text-[11px] font-semibold text-slate-600 mb-6 leading-snug">{role.desc}</p>
                       </div>
                       
                       <div>
                          <div className="flex gap-2 mb-4">
                             <div className="flex-1 bg-black rounded-lg p-3 text-white">
                                <p className="text-[8px] font-bold text-slate-400 mb-0.5">Usuarios</p>
                                <p className={`text-base font-black ${isSelected ? "text-blue-500" : ""}`}>{role.usuarios}</p>
                             </div>
                             <div className="flex-1 bg-black rounded-lg p-3 text-white">
                                <p className="text-[8px] font-bold text-slate-400 mb-0.5">Activos</p>
                                <p className={`text-base font-black ${isSelected ? "text-blue-500" : ""}`}>{role.activos}</p>
                             </div>
                          </div>
                          <div className="flex justify-between items-center border-t border-slate-200/60 pt-3">
                             <span className="text-[11px] font-black text-slate-800">{role.accesos} permisos</span>
                             <span className="text-[10px] font-bold text-blue-600">{isSelected ? "Seleccionado" : "Ver detalle"}</span>
                          </div>
                       </div>
                    </div>
                 )
              })}
           </div>
        </CardContent>
      </Card>

      {/* Maestro Detalle 2 Cols */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Detalle del rol */}
         <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden lg:col-span-1">
            <div className="p-6 border-b border-slate-200 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-black text-slate-900">Detalle del rol</h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{selectedRole.codigo}</p>
              </div>
              <div className="w-16 h-5 bg-black rounded-full"></div>
            </div>
            <CardContent className="p-6 flex flex-col items-center text-center">
               <div className="w-16 h-16 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
               </div>
               <h3 className="text-xl font-black text-slate-900 mb-1">{selectedRole.nombre}</h3>
               <p className="text-[11px] font-semibold text-slate-500 mb-8">{selectedRole.desc}</p>
               
               <div className="grid grid-cols-2 gap-3 w-full">
                  <div className="bg-blue-50 rounded-xl p-4 text-left">
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Identificador</p>
                     <p className="text-base font-black text-blue-600">{selectedRole.identificador}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-left">
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Código</p>
                     <p className="text-base font-black text-blue-600">{selectedRole.codigo}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-left">
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Usuarios</p>
                     <p className="text-base font-black text-blue-600">{selectedRole.usuarios}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-left">
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Accesos</p>
                     <p className="text-base font-black text-blue-600">{selectedRole.accesos}</p>
                  </div>
               </div>
            </CardContent>
         </Card>

         {/* Usuarios con el rol */}
         <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden lg:col-span-2 flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-black text-slate-900">Usuarios con rol {selectedRole.nombre}</h2>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Cuentas institucionales asociadas al rol seleccionado.</p>
              </div>
              <div className="bg-black text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm">
                {selectedRole.usersList.length} usuario(s)
              </div>
            </div>
            <CardContent className="p-6 flex-1 overflow-y-auto space-y-3">
               {selectedRole.usersList.map(u => (
                 <div key={u.id} className="border border-slate-200 rounded-xl p-4 flex justify-between items-center hover:bg-slate-50 transition-colors shadow-sm">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-black text-xs shrink-0">
                         {u.iniciales}
                       </div>
                       <div>
                         <h4 className="text-xs font-black text-slate-900">{u.nombre}</h4>
                         <p className="text-[10px] font-black text-blue-600 mt-0.5">{u.codigo}</p>
                         <p className="text-[9px] font-bold text-slate-500">{u.email}</p>
                       </div>
                    </div>
                    <div className="w-10 h-4 bg-black rounded-full"></div>
                 </div>
               ))}
               {selectedRole.usersList.length < selectedRole.usuarios && (
                  <div className="text-center py-4">
                     <p className="text-[10px] font-bold text-slate-400 italic">Mostrando solo resultados recientes (demo).</p>
                  </div>
               )}
            </CardContent>
         </Card>
      </div>

      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6">
           <h2 className="text-sm font-black text-slate-900">Rol oficial del sistema</h2>
           <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Los roles oficiales no se eliminan. La asignación de cuentas se administra desde Gestión de usuarios.</p>
        </CardContent>
      </Card>

      {/* Matriz de Permisos */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-black text-slate-900">Matriz de permisos</h2>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Comparación de los accesos funcionales asignados a cada rol.</p>
          </div>
          <div 
            onClick={() => toast.info("Funcionalidad de configuración institucional aún en desarrollo (demo).")}
            className="bg-black hover:bg-slate-800 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-sm cursor-pointer transition-colors"
          >
            Configuración institucional
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
             <thead className="bg-black text-white">
                <tr>
                   <th className="px-6 py-4 font-semibold text-[10px] text-slate-400 w-1/2">
                      Los accesos corresponden a la configuración funcional vigente. La asignación se administra por rol completo para mantener una política institucional uniforme.
                   </th>
                   <th className="px-6 py-4 font-black uppercase tracking-widest text-blue-500 text-center w-1/6">
                      {selectedRole.nombre}
                   </th>
                   <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-800 text-center w-1/6">
                   </th>
                   <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-800 text-center w-1/6">
                   </th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-200">
                {PERMISOS_MATRIX.map((perm, idx) => {
                   const isAllowed = selectedRole.permisos.includes(perm.area);
                   return (
                     <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                           <h4 className="text-xs font-black text-slate-900 mb-0.5">{perm.areaDisplay || perm.area}</h4>
                           <p className="text-[10px] font-black text-blue-600 mb-1">{perm.action}</p>
                           <p className="text-[10px] font-bold text-slate-500">{perm.desc}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <button 
                              onClick={() => handleTogglePermission(selectedRole.id, perm.area)}
                              className="focus:outline-none transition-transform hover:scale-105"
                           >
                              {isAllowed ? (
                                 <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                    <span className="text-[10px] font-black text-green-700">Permitido</span>
                                 </div>
                              ) : (
                                 <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                    <span className="text-[10px] font-black text-slate-600">Sin acceso</span>
                                 </div>
                              )}
                           </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <div className="inline-block w-12 h-4 bg-black rounded-full"></div>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <div className="inline-block w-12 h-4 bg-black rounded-full"></div>
                        </td>
                     </tr>
                   )
                })}
             </tbody>
          </table>
        </div>
      </Card>
      
    </div>
  );
}
