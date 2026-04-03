import type { Integration } from "./types";

export function getIntegrations(userDept: string): Integration[] {
  const all: Integration[] = [
    {
      id: "fleethunt",
      name: "FleetHunt",
      icon: null, // SVG icons are rendered inline in the sidebar component
      active: false,
      department: "logistics",
      connected: true,
      color: "#557C93",
    },
    {
      id: "samsara",
      name: "Samsara",
      icon: null,
      active: false,
      department: "logistics",
      connected: false,
      color: "#14b8a6",
    },
    {
      id: "restaurant-pos",
      name: "Restaurant POS",
      icon: null,
      active: false,
      department: "restaurant",
      connected: true,
      color: "#f97316",
    },
    {
      id: "quickbooks",
      name: "QuickBooks",
      icon: null,
      active: false,
      department: "finance",
      connected: false,
      color: "#22c55e",
    },
    {
      id: "highway",
      name: "Highway",
      icon: null,
      active: false,
      department: "logistics",
      connected: false,
      color: "#6366f1",
    },
    {
      id: "triumph",
      name: "Triumph Pay",
      icon: null,
      active: false,
      department: "finance",
      connected: false,
      color: "#8b5cf6",
    },
  ];

  return all
    .filter((integ) => integ.department === userDept)
    .map((integ) => ({
      ...integ,
      active: integ.connected,
    }));
}
