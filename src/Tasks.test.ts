import { assertEquals, assertThrows } from "@std/assert";
import { normalizeDueDate } from "./Tasks.ts";

Deno.test("normalizeDueDate: ISO date only returns midnight UTC", () => {
  assertEquals(normalizeDueDate("2025-03-19"), "2025-03-19T00:00:00.000Z");
});

Deno.test("normalizeDueDate: datetime without timezone returns date at midnight UTC", () => {
  assertEquals(normalizeDueDate("2025-03-19T21:00:00"), "2025-03-19T00:00:00.000Z");
});

Deno.test("normalizeDueDate: datetime with Z returns date at midnight UTC", () => {
  assertEquals(normalizeDueDate("2025-03-19T21:00:00Z"), "2025-03-19T00:00:00.000Z");
});

Deno.test("normalizeDueDate: datetime with offset returns UTC date at midnight", () => {
  assertEquals(normalizeDueDate("2025-03-19T21:00:00+05:00"), "2025-03-19T00:00:00.000Z");
});

Deno.test("normalizeDueDate: invalid string throws", () => {
  assertThrows(() => normalizeDueDate("not-a-date"), Error, "Invalid due date format");
});

Deno.test("normalizeDueDate: undefined passes through", () => {
  assertEquals(normalizeDueDate(undefined), undefined);
});
