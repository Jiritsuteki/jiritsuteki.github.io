export interface ContributionDay {
  date: string;
  count: number;
}

export interface CalendarDay extends ContributionDay {
  level: 0 | 1 | 2 | 3 | 4;
  col: number;
  row: number;
  valid: boolean;
}

export interface HoveredDay extends CalendarDay {
  x: number;
  y: number;
}

export interface ColorChange {
  mix: number;
  color: string;
}

export interface SlatGraphOptions {
  year?: number;
  data?: ContributionDay[];
  radius?: number;
  strength?: number;
  speed?: number;
  trail?: number;
  minWidth?: number;
  paused?: boolean;
  variant?: "slats" | "squares";
  onHover?: (day: HoveredDay | null) => void;
  onColorChange?: (value: ColorChange) => void;
}

export function makeCalendar(
  year: number,
  data?: ContributionDay[],
): CalendarDay[];

export class SlatGraph {
  constructor(host: HTMLElement, options?: SlatGraphOptions);
  update(options?: SlatGraphOptions): void;
  destroy(): void;
}
