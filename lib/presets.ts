import { blankPricing, calculatePricing, type PricingInput } from "./pricing.ts";

export type Shop = Pick<PricingInput, "fixedMonthly" | "productiveHours" | "laborHour" | "electricityKwh" | "taxesPercent" | "feesPercent" | "marginPercent">;
export type Material = { id: string; name: string; category: PricingInput["category"]; unit: "folha" | "g" | "un" | "m2"; price: number; packSize: number; widthCm: number; heightCm: number };
export type Machine = { id: string; name: string; category: PricingInput["category"]; value: number; residual: number; usefulHours: number; maintenanceHour: number; powerWatts: number; ink: Record<"text" | "color" | "photo", number | null> };
export type Presets = { version: 1; shop: Shop; shopConfigured: boolean; materials: Material[]; machines: Machine[] };
export const presetKey = "ygprint:presets:v1";
export const emptyPresets: Presets = { version: 1, shopConfigured: false, materials: [], machines: [], shop: { fixedMonthly: 0, productiveHours: 160, laborHour: 0, electricityKwh: 0, taxesPercent: 0, feesPercent: 0, marginPercent: 30 } };

export function validatePresets(value: unknown): asserts value is Presets {
  if (!value || typeof value !== "object") throw new Error("Configurações inválidas.");
  const p = value as Presets;
  if (p.version !== 1 || typeof p.shopConfigured !== "boolean" || !p.shop || !Array.isArray(p.materials) || !Array.isArray(p.machines) || p.materials.length > 200 || p.machines.length > 200) throw new Error("Configurações inválidas.");
  for (const key of Object.keys(emptyPresets.shop) as (keyof Shop)[]) if (typeof p.shop[key] !== "number") throw new Error("Preencha as configurações da loja.");
  calculatePricing({ ...blankPricing, ...p.shop });
  const checkName = (item: { id: string; name: string }, ids: Set<string>) => {
    if (!item || typeof item.id !== "string" || !item.id || item.id.length > 160 || ids.has(item.id) || typeof item.name !== "string" || !item.name.trim() || item.name.length > 160) throw new Error("Informe um nome válido para o cadastro.");
    ids.add(item.id);
  };
  const materialIds = new Set<string>();
  for (const m of p.materials) {
    checkName(m, materialIds);
    if (!["folha", "g", "un", "m2"].includes(m.unit) || (m.category === "digital" && m.unit !== "folha") || (m.category === "3d" && m.unit !== "g")) throw new Error("Use folhas para impressão digital e gramas para filamento.");
    calculatePricing({ ...blankPricing, category: m.category, materialPrice: m.price, packSize: m.packSize, widthCm: m.widthCm, heightCm: m.heightCm });
    if (m.category === "digital" && (m.widthCm <= 0 || m.heightCm <= 0)) throw new Error("Informe o tamanho do papel.");
  }
  const machineIds = new Set<string>();
  for (const m of p.machines) {
    checkName(m, machineIds);
    calculatePricing({ ...blankPricing, category: m.category, machineValue: m.value, residualValue: m.residual, usefulHours: m.usefulHours, maintenanceHour: m.maintenanceHour, powerWatts: m.powerWatts });
    if (!m.ink) throw new Error("Perfis de tinta inválidos.");
    for (const profile of ["text", "color", "photo"] as const) {
      if (m.ink[profile] !== null && (typeof m.ink[profile] !== "number" || !Number.isFinite(m.ink[profile]) || m.ink[profile]! < 0 || m.ink[profile]! > 1e9)) throw new Error("Custo de tinta inválido.");
    }
  }
}

export function readPresets(): Presets {
  const raw = localStorage.getItem(presetKey);
  if (!raw) return structuredClone(emptyPresets);
  const value: unknown = JSON.parse(raw);
  validatePresets(value);
  return value;
}

export function writePresets(value: Presets) {
  validatePresets(value);
  localStorage.setItem(presetKey, JSON.stringify(value));
  window.dispatchEvent(new Event("ygprint:presets-changed"));
}

export function applyMaterial(input: PricingInput, m: Material): PricingInput {
  if (input.category !== m.category) throw new Error("Selecione um material do mesmo tipo de produção.");
  return { ...input, materialId: m.id, materialName: m.name, materialPrice: m.price, packSize: m.packSize,
    materialUsed: m.category === "digital" ? input.quantity : input.materialUsed,
    widthCm: m.widthCm, heightCm: m.heightCm };
}

export function applyMachine(input: PricingInput, m: Machine, profile: "text" | "color" | "photo"): PricingInput {
  if (input.category !== m.category) throw new Error("Selecione uma impressora do mesmo tipo de produção.");
  return { ...input, machineId: m.id, machineName: m.name, machineValue: m.value, residualValue: m.residual,
    usefulHours: m.usefulHours, maintenanceHour: m.maintenanceHour, powerWatts: m.powerWatts,
    inkProfile: profile, inkCostPerA4: m.category === "digital" ? m.ink[profile] ?? undefined : undefined,
    // Clear former detailed ink assumptions when selecting a registered machine.
    inkMlM2: 0, inkPrice: 0, inkBottleMl: 100, coveragePercent: 100 };
}

export function changeQuantity(input: PricingInput, quantity: number): PricingInput {
  return { ...input, quantity, materialUsed: input.category === "digital" ? input.materialUsed / input.quantity * quantity : input.materialUsed };
}
