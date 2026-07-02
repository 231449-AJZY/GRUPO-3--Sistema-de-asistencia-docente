import { mockAdminDashboard } from "@/data/mockAdminDashboard";
import type { AdminDashboardData } from "@/types/dashboard";

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  try {
    const response = await fetch("http://localhost:3000/api/dashboard/admin", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer internal-server-token",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return mockAdminDashboard;
    }

    return response.json();
  } catch {
    return mockAdminDashboard;
  }
}
