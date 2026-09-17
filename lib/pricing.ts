export type PricingInput = {
  name: string;
  category: "3d" | "digital" | "outro";
  quantity: number;
  materialPrice: number;
  packSize: number;
  materialUsed: number;
  wastePercent: number;
  machineMinutes: number;
  machineValue: number;
  residualValue: number;
  usefulHours: number;
  maintenanceHour: number;
  powerWatts: number;
  electricityKwh: number;
  laborMinutes: number;
  laborHour: number;
  fixedMonthly: number;
  productiveHours: number;
  finishing: number;
  packaging: number;
  widthCm: number;
  heightCm: number;
  sides: number;
  coveragePercent: number;
  inkMlM2: number;
  inkPrice: number;
  inkBottleMl: number;
  taxesPercent: number;
  feesPercent: number;
  marginPercent: number;
  // Optional snapshot metadata; old drafts retain their original calculation.
  materialId?: string;
  materialName?: string;
  machineId?: string;
  machineName?: string;
  inkCostPerA4?: number;
  inkProfile?: "text" | "color" | "photo";
};

export const blankPricing: PricingInput = {
  name: "", category: "3d", quantity: 1,
  materialPrice: 0, packSize: 1000, materialUsed: 0, wastePercent: 0,
  machineMinutes: 0, machineValue: 0, residualValue: 0, usefulHours: 5000,
  maintenanceHour: 0, powerWatts: 0, electricityKwh: 0,
  laborMinutes: 0, laborHour: 0, fixedMonthly: 0, productiveHours: 160,
  finishing: 0, packaging: 0, widthCm: 0, heightCm: 0, sides: 1,
  coveragePercent: 0, inkMlM2: 0, inkPrice: 0, inkBottleMl: 100,
  taxesPercent: 0, feesPercent: 0, marginPercent: 30,
};

export function validatePricing(value: unknown): asserts value is PricingInput {
  if (!value || typeof value !== "object") throw new Error("Dados de precificação inválidos.");
  const input = value as Record<string, unknown>;
  if (typeof input.name !== "string" || input.name.length > 160) throw new Error("Use um nome com até 160 caracteres.");
  if (!["3d", "digital", "outro"].includes(String(input.category))) throw new Error("Tipo de produção inválido.");
  for (const [key, defaultValue] of Object.entries(blankPricing)) {
    if (typeof defaultValue !== "number") continue;
    const n = input[key];
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1e9) throw new Error("Preencha valores numéricos válidos, maiores ou iguais a zero.");
  }
  const p = value as PricingInput;
  for (const key of ["materialId", "materialName", "machineId", "machineName"] as const) {
    if (p[key] !== undefined && (typeof p[key] !== "string" || p[key].length > 160)) throw new Error("Referência de cadastro inválida.");
  }
  if (p.inkCostPerA4 !== undefined && (!Number.isFinite(p.inkCostPerA4) || p.inkCostPerA4 < 0 || p.inkCostPerA4 > 1e9)) throw new Error("Custo de tinta por A4 inválido.");
  if (p.inkProfile !== undefined && !["text", "color", "photo"].includes(p.inkProfile)) throw new Error("Perfil de tinta inválido.");
  if (!Number.isInteger(p.quantity) || p.quantity < 1) throw new Error("A quantidade deve ser um número inteiro maior que zero.");
  if (p.packSize <= 0 || p.usefulHours <= 0 || p.productiveHours <= 0 || p.inkBottleMl <= 0) throw new Error("Conteúdo da embalagem, vida útil, horas produtivas e volume de tinta devem ser maiores que zero.");
  if (p.residualValue > p.machineValue) throw new Error("O valor residual não pode superar o valor da máquina.");
  if (p.coveragePercent > 100 || p.wastePercent > 100) throw new Error("Cobertura e perdas devem estar entre 0% e 100%.");
  if (![1, 2].includes(p.sides)) throw new Error("Selecione uma ou duas faces.");
  if (p.taxesPercent + p.feesPercent + p.marginPercent >= 100) throw new Error("Impostos + taxas + margem devem somar menos de 100%.");
}

/** All consumption/time/extra costs are for the whole batch. Only ink area multiplies quantity. */
export function calculatePricing(input: PricingInput) {
  validatePricing(input);
  const p = input;
  const hours = p.machineMinutes / 60;
  const material = p.materialUsed / p.packSize * p.materialPrice;
  const areaM2 = p.category === "digital" ? p.widthCm / 100 * (p.heightCm / 100) * p.sides * p.quantity : 0;
  const inkMl = p.inkCostPerA4 === undefined ? areaM2 * p.coveragePercent / 100 * p.inkMlM2 : 0;
  const ink = p.inkCostPerA4 === undefined ? inkMl / p.inkBottleMl * p.inkPrice : areaM2 / (0.21 * 0.297) * p.inkCostPerA4;
  const losses = (material + ink) * p.wastePercent / 100;
  const depreciation = (p.machineValue - p.residualValue) / p.usefulHours * hours;
  const maintenance = p.maintenanceHour * hours;
  const energy = p.powerWatts / 1000 * hours * p.electricityKwh;
  const labor = p.laborMinutes / 60 * p.laborHour;
  const fixed = p.fixedMonthly / p.productiveHours * hours;
  const breakdown = [
    { label: "Matéria-prima", value: material },
    { label: "Tinta estimada", value: ink },
    { label: "Reserva de material e tinta", value: losses },
    { label: "Depreciação", value: depreciation },
    { label: "Manutenção", value: maintenance },
    { label: "Energia", value: energy },
    { label: "Mão de obra", value: labor },
    { label: "Rateio de custos fixos", value: fixed },
    { label: "Acabamento e terceiros", value: p.finishing },
    { label: "Embalagem", value: p.packaging },
  ];
  const totalCost = breakdown.reduce((sum, item) => sum + item.value, 0);
  const divisor = 1 - (p.taxesPercent + p.feesPercent + p.marginPercent) / 100;
  const rawPrice = totalCost / divisor / p.quantity;
  // Round up to cents so the displayed selling price does not undercut the target margin.
  const unitPrice = Math.ceil(Number(rawPrice.toFixed(8)) * 100) / 100;
  const saleTotal = unitPrice * p.quantity;
  const taxes = saleTotal * p.taxesPercent / 100;
  const fees = saleTotal * p.feesPercent / 100;
  const profit = saleTotal - totalCost - taxes - fees;
  if (![totalCost, unitPrice, saleTotal, profit].every(Number.isFinite)) throw new Error("Os valores informados ultrapassam o limite de cálculo.");
  return { breakdown, totalCost, unitCost: totalCost / p.quantity, unitPrice, saleTotal, taxes, fees, profit,
    markup: totalCost > 0 ? saleTotal / totalCost : 0,
    actualMargin: saleTotal > 0 ? profit / saleTotal * 100 : 0,
    areaM2, inkMl,
  };
}
