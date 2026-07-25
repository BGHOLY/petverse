import { Injectable } from '@nestjs/common';

export const PETVERSE_TIMEZONE_OFFSET_MINUTES = 8 * 60;
export const PETVERSE_DAILY_RESET_HOUR = 5;

@Injectable()
export class ServerTimeService {
  now() {
    return new Date();
  }

  dayKey(value: Date | string | number = this.now()) {
    return this.shifted(value).toISOString().slice(0, 10);
  }

  weekKey(value: Date | string | number = this.now()) {
    const shifted = this.shifted(value);
    const day = shifted.getUTCDay() || 7;
    shifted.setUTCDate(shifted.getUTCDate() - day + 1);
    return shifted.toISOString().slice(0, 10);
  }

  monthKey(value: Date | string | number = this.now()) {
    return this.shifted(value).toISOString().slice(0, 7);
  }

  cycleKey(days: number, value: Date | string | number = this.now()) {
    const normalizedDays = Math.max(1, Math.floor(Number(days || 1)));
    const shifted = this.shifted(value);
    const epochDay = Math.floor(shifted.getTime() / 86_400_000);
    return String(Math.floor(epochDay / normalizedDays));
  }

  startOfDay(value: Date | string | number = this.now()) {
    const shifted = this.shifted(value);
    shifted.setUTCHours(0, 0, 0, 0);
    return new Date(
      shifted.getTime() -
        PETVERSE_TIMEZONE_OFFSET_MINUTES * 60_000 +
        PETVERSE_DAILY_RESET_HOUR * 3_600_000,
    );
  }

  nextDailyReset(value: Date | string | number = this.now()) {
    const start = this.startOfDay(value);
    return new Date(start.getTime() + 86_400_000);
  }

  secondsUntilDailyReset(value: Date | string | number = this.now()) {
    const now = this.asDate(value);
    return Math.max(
      0,
      Math.ceil((this.nextDailyReset(now).getTime() - now.getTime()) / 1000),
    );
  }

  clock(value: Date | string | number = this.now()) {
    const now = this.asDate(value);
    return {
      serverNow: now.toISOString(),
      timezone: 'Asia/Shanghai',
      timezoneOffsetMinutes: PETVERSE_TIMEZONE_OFFSET_MINUTES,
      dailyResetHour: PETVERSE_DAILY_RESET_HOUR,
      dayKey: this.dayKey(now),
      weekKey: this.weekKey(now),
      monthKey: this.monthKey(now),
      nextDailyReset: this.nextDailyReset(now).toISOString(),
      secondsUntilDailyReset: this.secondsUntilDailyReset(now),
    };
  }

  private shifted(value: Date | string | number) {
    const date = this.asDate(value);
    return new Date(
      date.getTime() +
        PETVERSE_TIMEZONE_OFFSET_MINUTES * 60_000 -
        PETVERSE_DAILY_RESET_HOUR * 3_600_000,
    );
  }

  private asDate(value: Date | string | number) {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) return this.now();
    return date;
  }
}
