const DEFAULT_FUEL_EFFICIENCY_KM_PER_LITER = 12;
const DEFAULT_GAS_PRICE_CENTS_PER_LITER = 2400;
const DRIVING_CO2_GRAMS_PER_KM = 192;

export type MobilityCostInput = {
  origin: string;
  destination: string;
  distanceMeters?: number;
  maxPassengers: number;
  fuelEfficiencyKmPerLiter?: number;
  averageGasPriceCentsPerLiter?: number;
};

export type MobilityCostEstimate = {
  distanceMeters: number;
  estimatedGasCostCents: number;
  costPerPersonCents: number;
  co2Grams: number;
  co2SavingsGrams: number;
};

export function estimateMobilityCosts(input: MobilityCostInput): MobilityCostEstimate {
  const distanceMeters = Math.max(0, Math.round(input.distanceMeters ?? estimateDistanceMeters(input.origin, input.destination)));
  const gasCost = estimateGasCostCents(
    distanceMeters,
    input.fuelEfficiencyKmPerLiter ?? DEFAULT_FUEL_EFFICIENCY_KM_PER_LITER,
    input.averageGasPriceCentsPerLiter ?? DEFAULT_GAS_PRICE_CENTS_PER_LITER,
  );
  const riders = Math.max(1, input.maxPassengers + 1);
  const drivingCo2 = estimateDrivingCo2Grams(distanceMeters);
  const sharedCo2 = Math.round(drivingCo2 / riders);

  return {
    distanceMeters,
    estimatedGasCostCents: gasCost,
    costPerPersonCents: Math.ceil(gasCost / riders),
    co2Grams: sharedCo2,
    co2SavingsGrams: Math.max(0, drivingCo2 - sharedCo2),
  };
}

export function estimateDistanceMeters(origin: string, destination: string): number {
  const seed = `${origin.trim().toLowerCase()}|${destination.trim().toLowerCase()}`
    .split("")
    .reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return 4_500 + (seed % 18_000);
}

export function estimateGasCostCents(
  distanceMeters: number,
  fuelEfficiencyKmPerLiter: number,
  averageGasPriceCentsPerLiter: number,
): number {
  if (fuelEfficiencyKmPerLiter <= 0 || averageGasPriceCentsPerLiter <= 0) {
    return 0;
  }

  const liters = distanceMeters / 1000 / fuelEfficiencyKmPerLiter;
  return Math.round(liters * averageGasPriceCentsPerLiter);
}

export function estimateDrivingCo2Grams(distanceMeters: number): number {
  return Math.round((distanceMeters / 1000) * DRIVING_CO2_GRAMS_PER_KM);
}

export function estimateAddressOffsetMeters(primary: string, candidate: string): number {
  const primaryTokens = tokenize(primary);
  const candidateTokens = tokenize(candidate);
  if (!primaryTokens.length || !candidateTokens.length) {
    return 3_500;
  }

  const overlap = candidateTokens.filter((token) => primaryTokens.includes(token)).length;
  if (normalize(primary).includes(normalize(candidate)) || normalize(candidate).includes(normalize(primary))) {
    return 450;
  }

  if (overlap === 0) {
    return 3_800;
  }

  return Math.max(650, 2_600 - overlap * 700);
}

export function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}
