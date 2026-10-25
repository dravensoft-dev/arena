/* The colour-vision-deficiency simulation check:ramp runs over the heat ladder. The numbers are
 * the ones the vendored validate-palette.mjs holds: the Machado, Oliveira and Fernandes (2009)
 * severity-1.0 matrices, applied in linear sRGB and clamped. The vendored file is re-vendored
 * rather than patched and does not export its simulation, so the gate carries its own copy, and
 * cvd.test.ts holds the copy to the vendored text. Repository-only: no package ships it. */

export type CvdKind = 'protan' | 'deutan' | 'tritan';

export const CVD_KINDS: readonly CvdKind[] = ['protan', 'deutan', 'tritan'];

type Matrix = [[number, number, number], [number, number, number], [number, number, number]];

export const MACHADO: Record<CvdKind, Matrix> = {
  protan: [[0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.303900]],
};

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const clamp = (c: number) => Math.max(0, Math.min(1, c));

export function simulatedLightness(hex: string, kind: CvdKind): number {
  const [r, g, b] = [1, 3, 5].map((at) => toLinear(parseInt(hex.slice(at, at + 2), 16) / 255)) as [number, number, number];
  const [red, green, blue] = MACHADO[kind].map(([x, y, z]) => clamp(x * r + y * g + z * b)) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
  return 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
}
