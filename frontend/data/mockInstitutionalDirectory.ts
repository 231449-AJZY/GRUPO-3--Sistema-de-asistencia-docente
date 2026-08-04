export type InstitutionalRole =
  | "ADMINISTRADOR"
  | "DOCENTE"
  | "SUPERVISOR";

export interface InstitutionalIdentity {
  codigo: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  email: string;
  rol: InstitutionalRole;
}

export const institutionalDirectory: InstitutionalIdentity[] = [
  {
    codigo: "ADM-001",
    nombres: "Gabriel",
    apellidos: "Administrador UNSAAC",
    nombreCompleto:
      "Gabriel Administrador UNSAAC",
    email: "admin@unsaac.edu.pe",
    rol: "ADMINISTRADOR",
  },
  {
    codigo: "DOC-001",
    nombres: "Alberto",
    apellidos: "Acosta Sullca",
    nombreCompleto:
      "Alberto Acosta Sullca",
    email: "aacosta@unsaac.edu.pe",
    rol: "DOCENTE",
  },
  {
    codigo: "DOC-002",
    nombres: "Verónica",
    apellidos: "Holgado Canales",
    nombreCompleto:
      "Verónica Holgado Canales",
    email: "vholgado@unsaac.edu.pe",
    rol: "DOCENTE",
  },
  {
    codigo: "DOC-003",
    nombres: "Miguel Ángel",
    apellidos: "Valdivia Cárdenas",
    nombreCompleto:
      "Miguel Ángel Valdivia Cárdenas",
    email: "mvaldivia@unsaac.edu.pe",
    rol: "DOCENTE",
  },
  {
    codigo: "DOC-004",
    nombres: "Nelly Patricia",
    apellidos: "Jiménez Chino",
    nombreCompleto:
      "Nelly Patricia Jiménez Chino",
    email: "njimenez@unsaac.edu.pe",
    rol: "DOCENTE",
  },
  {
    codigo: "DOC-005",
    nombres: "Walter Paul",
    apellidos: "Orosco Soto",
    nombreCompleto:
      "Walter Paul Orosco Soto",
    email: "worosco@unsaac.edu.pe",
    rol: "DOCENTE",
  },
  {
    codigo: "DOC-006",
    nombres: "Eliana",
    apellidos: "Cáceres Andía",
    nombreCompleto:
      "Eliana Cáceres Andía",
    email: "ecaceres@unsaac.edu.pe",
    rol: "DOCENTE",
  },
  {
    codigo: "DOC-007",
    nombres: "Juan Carlos",
    apellidos: "Arias Loayza",
    nombreCompleto:
      "Juan Carlos Arias Loayza",
    email: "jarias@unsaac.edu.pe",
    rol: "DOCENTE",
  },
  {
    codigo: "DOC-008",
    nombres: "Rosario",
    apellidos: "Quispe Apaza",
    nombreCompleto:
      "Rosario Quispe Apaza",
    email: "rquispe@unsaac.edu.pe",
    rol: "DOCENTE",
  },
  {
    codigo: "DOC-009",
    nombres: "Gabriela",
    apellidos: "Núñez Vargas",
    nombreCompleto:
      "Gabriela Núñez Vargas",
    email: "gnunez@unsaac.edu.pe",
    rol: "DOCENTE",
  },
  {
    codigo: "DOC-010",
    nombres: "Luis Fernando",
    apellidos: "Chura Salas",
    nombreCompleto:
      "Luis Fernando Chura Salas",
    email: "lchura@unsaac.edu.pe",
    rol: "DOCENTE",
  },
  {
    codigo: "DOC-011",
    nombres: "Patricia Milagros",
    apellidos: "Sucso León",
    nombreCompleto:
      "Patricia Milagros Sucso León",
    email: "psucso@unsaac.edu.pe",
    rol: "DOCENTE",
  },
  {
    codigo: "DOC-012",
    nombres: "Jorge Wilfredo",
    apellidos: "Yábar Mendoza",
    nombreCompleto:
      "Jorge Wilfredo Yábar Mendoza",
    email: "jyabar@unsaac.edu.pe",
    rol: "DOCENTE",
  },
  {
    codigo: "SUP-001",
    nombres: "Rosa Isabel",
    apellidos: "Condori Ccama",
    nombreCompleto:
      "Rosa Isabel Condori Ccama",
    email: "rcondori@unsaac.edu.pe",
    rol: "SUPERVISOR",
  },
  {
    codigo: "SUP-002",
    nombres: "Ana Lucía",
    apellidos: "Ccahuana Ramos",
    nombreCompleto:
      "Ana Lucía Ccahuana Ramos",
    email: "accahuana@unsaac.edu.pe",
    rol: "SUPERVISOR",
  },
];

export const institutionalIdentityByCode =
  institutionalDirectory.reduce<
    Record<string, InstitutionalIdentity>
  >(
    (directory, identity) => {
      directory[identity.codigo] =
        identity;

      return directory;
    },
    {}
  );

export function getInstitutionalIdentity(
  codigo: string
) {
  const normalizedCode =
    codigo.trim().toUpperCase();

  return (
    institutionalIdentityByCode[
      normalizedCode
    ] ?? null
  );
}