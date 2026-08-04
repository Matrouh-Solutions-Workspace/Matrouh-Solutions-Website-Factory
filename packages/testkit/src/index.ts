import type { Clock, IdGenerator } from "@factory/domain";
export class FixedClock implements Clock {
  constructor(private readonly value: Date) {}
  now(): Date {
    return new Date(this.value);
  }
}
export class SequenceIds implements IdGenerator<string> {
  private index = 0;
  next(): string {
    this.index += 1;
    return `test-${this.index}`;
  }
}
