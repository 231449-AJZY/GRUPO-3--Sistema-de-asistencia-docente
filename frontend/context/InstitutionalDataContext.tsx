"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import {
  institutionalDirectory,
  type InstitutionalIdentity,
  type InstitutionalRole,
} from "@/data/mockInstitutionalDirectory";

import {
  mockUsuarios,
} from "@/data/mockUsuarios";

import type {
  Usuario,
} from "@/types/usuario";

const STORAGE_KEY =
  "unsaac_institutional_data_v1";

interface InstitutionalSnapshot {
  version: 1;
  identities: InstitutionalIdentity[];
  usuarios: Usuario[];
}

interface UpsertIdentityInput {
  previousCode?: string;
  codigo: string;
  nombres: string;
  apellidos: string;
  email: string;
}

interface InstitutionalDataContextValue {
  identities: InstitutionalIdentity[];
  usuarios: Usuario[];
  hydrated: boolean;

  setUsuarios: Dispatch<
    SetStateAction<Usuario[]>
  >;

  getIdentity: (
    codigo: string
  ) => InstitutionalIdentity | null;

  upsertIdentity: (
    input: UpsertIdentityInput
  ) => void;

  deleteUsuarioAccount: (
    usuarioId: number
  ) => void;

  resetInstitutionalData: () => void;
}

export const InstitutionalDataContext =
  createContext<
    InstitutionalDataContextValue | null
  >(null);

export default function InstitutionalDataProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [identities, setIdentities] =
    useState<InstitutionalIdentity[]>(
      () => cloneIdentities(
        institutionalDirectory
      )
    );

  const [
    usuarios,
    setUsuariosState,
  ] = useState<Usuario[]>(
    () => cloneUsuarios(mockUsuarios)
  );

  const [hydrated, setHydrated] =
    useState(false);

  useEffect(() => {
    const stored =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (stored) {
      try {
        const snapshot =
          JSON.parse(
            stored
          ) as InstitutionalSnapshot;

        if (
          snapshot.version === 1 &&
          Array.isArray(
            snapshot.identities
          ) &&
          Array.isArray(
            snapshot.usuarios
          )
        ) {
          const loadedIdentities =
            cloneIdentities(
              snapshot.identities
            );

          setIdentities(
            loadedIdentities
          );

          setUsuariosState(
            synchronizeUsersWithIdentities(
              cloneUsuarios(
                snapshot.usuarios
              ),
              loadedIdentities
            )
          );
        }
      } catch {
        window.localStorage.removeItem(
          STORAGE_KEY
        );
      }
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const snapshot: InstitutionalSnapshot =
      {
        version: 1,
        identities,
        usuarios,
      };

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(snapshot)
    );
  }, [
    hydrated,
    identities,
    usuarios,
  ]);

  useEffect(() => {
    function handleStorage(
      event: StorageEvent
    ) {
      if (
        event.key !== STORAGE_KEY ||
        !event.newValue
      ) {
        return;
      }

      try {
        const snapshot =
          JSON.parse(
            event.newValue
          ) as InstitutionalSnapshot;

        if (
          snapshot.version !== 1
        ) {
          return;
        }

        const nextIdentities =
          cloneIdentities(
            snapshot.identities
          );

        setIdentities(
          nextIdentities
        );

        setUsuariosState(
          synchronizeUsersWithIdentities(
            cloneUsuarios(
              snapshot.usuarios
            ),
            nextIdentities
          )
        );
      } catch {
        // Se ignoran datos dañados de otra pestaña.
      }
    }

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  const setUsuarios: Dispatch<
    SetStateAction<Usuario[]>
  > = useCallback((action) => {
    setUsuariosState((current) => {
      const next =
        typeof action === "function"
          ? action(current)
          : action;

      return next;
    });
  }, []);

  const getIdentity = useCallback(
    (codigo: string) => {
      const normalizedCode =
        normalizeCode(codigo);

      return (
        identities.find(
          (identity) =>
            identity.codigo ===
            normalizedCode
        ) ?? null
      );
    },
    [identities]
  );

  const upsertIdentity = useCallback(
    (input: UpsertIdentityInput) => {
      const codigo =
        normalizeCode(input.codigo);

      const previousCode =
        normalizeCode(
          input.previousCode ?? codigo
        );

      const nombres =
        input.nombres.trim();

      const apellidos =
        input.apellidos.trim();

      const email =
        input.email
          .trim()
          .toLowerCase();

      const nextIdentity:
        InstitutionalIdentity = {
        codigo,
        nombres,
        apellidos,
        nombreCompleto:
          `${nombres} ${apellidos}`.trim(),
        email,
        rol: inferRole(codigo),
      };

      setIdentities((current) => {
        const existing =
          current.find(
            (identity) =>
              identity.codigo === codigo ||
              identity.codigo ===
                previousCode
          );

        const unchanged =
          existing &&
          existing.codigo === codigo &&
          existing.nombres === nombres &&
          existing.apellidos ===
            apellidos &&
          existing.email === email &&
          existing.rol ===
            nextIdentity.rol;

        if (unchanged) {
          return current;
        }

        return [
          ...current.filter(
            (identity) =>
              identity.codigo !== codigo &&
              identity.codigo !==
                previousCode
          ),
          nextIdentity,
        ].sort((first, second) =>
          first.codigo.localeCompare(
            second.codigo
          )
        );
      });

      setUsuariosState((current) => {
        let changed = false;

        const next = current.map(
          (usuario) => {
            const matches =
              usuario.codigo === codigo ||
              usuario.codigo ===
                previousCode;

            if (!matches) {
              return usuario;
            }

            const unchanged =
              usuario.codigo === codigo &&
              usuario.nombres === nombres &&
              usuario.apellidos ===
                apellidos &&
              usuario.email === email;

            if (unchanged) {
              return usuario;
            }

            changed = true;

            return {
              ...usuario,
              codigo,
              nombres,
              apellidos,
              email,
              actualizadoEn:
                new Date().toISOString(),
            };
          }
        );

        return changed
          ? next
          : current;
      });
    },
    []
  );

  const deleteUsuarioAccount =
    useCallback(
      (usuarioId: number) => {
        setUsuariosState((current) =>
          current.filter(
            (usuario) =>
              usuario.id !== usuarioId
          )
        );
      },
      []
    );

  const resetInstitutionalData =
    useCallback(() => {
      setIdentities(
        cloneIdentities(
          institutionalDirectory
        )
      );

      setUsuariosState(
        cloneUsuarios(mockUsuarios)
      );

      window.localStorage.removeItem(
        STORAGE_KEY
      );
    }, []);

  const value = useMemo<
    InstitutionalDataContextValue
  >(
    () => ({
      identities,
      usuarios,
      hydrated,
      setUsuarios,
      getIdentity,
      upsertIdentity,
      deleteUsuarioAccount,
      resetInstitutionalData,
    }),
    [
      identities,
      usuarios,
      hydrated,
      setUsuarios,
      getIdentity,
      upsertIdentity,
      deleteUsuarioAccount,
      resetInstitutionalData,
    ]
  );

  return (
    <InstitutionalDataContext.Provider
      value={value}
    >
      {children}
    </InstitutionalDataContext.Provider>
  );
}

function synchronizeUsersWithIdentities(
  users: Usuario[],
  identities: InstitutionalIdentity[]
) {
  return users.map((usuario) => {
    const identity =
      identities.find(
        (item) =>
          item.codigo ===
          usuario.codigo
      );

    if (!identity) {
      return usuario;
    }

    return {
      ...usuario,
      nombres: identity.nombres,
      apellidos: identity.apellidos,
      email: identity.email,
    };
  });
}

function normalizeCode(
  codigo: string
) {
  return codigo
    .trim()
    .toUpperCase();
}

function inferRole(
  codigo: string
): InstitutionalRole {
  if (codigo.startsWith("ADM-")) {
    return "ADMINISTRADOR";
  }

  if (codigo.startsWith("SUP-")) {
    return "SUPERVISOR";
  }

  return "DOCENTE";
}

function cloneIdentities(
  values: InstitutionalIdentity[]
) {
  return values.map((identity) => ({
    ...identity,
  }));
}

function cloneUsuarios(
  values: Usuario[]
) {
  return values.map((usuario) => ({
    ...usuario,
  }));
}