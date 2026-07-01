import { mockAdminDashboard } from "@/data/mockAdminDashboard";
import type { AdminDashboardData } from "@/types/dashboard";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

  if (useMock) {
    return mockAdminDashboard;
  }

  const response = await fetch(`${API_URL}/dashboard/admin`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("No se pudo cargar el dashboard del administrador");
  }

  return response.json();
}