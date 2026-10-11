/* The pools a heavy step can name, apart from the scheduler that sizes them, so a declaration can
 * be typed and judged without importing the deadlines the scheduler carries. A step that names no
 * pool is light. */

export const POOLS = ['browser', 'compiler'] as const;

export type Pool = (typeof POOLS)[number];
