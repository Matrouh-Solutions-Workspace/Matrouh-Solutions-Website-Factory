"use client";

import { useMemo, useState } from "react";

type ListItem = Record<string, string | number | boolean>;

export function StructuredListField({
  fieldName,
  initialJson,
  label,
}: {
  readonly fieldName: string;
  readonly initialJson: string;
  readonly label: string;
}) {
  const initialItems = useMemo(() => parseItems(initialJson), [initialJson]);
  const [items, setItems] = useState<ListItem[]>(initialItems);
  const editableKeys = useMemo(() => fieldKeys(items), [items]);

  function update(index: number, key: string, value: string) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: typedValue(item[key], value) } : item,
      ),
    );
  }

  function addItem() {
    const sample = items[0];
    const next: ListItem = sample
      ? Object.fromEntries(
          Object.entries(sample).map(([key, value]) => [
            key,
            key === "id"
              ? crypto.randomUUID()
              : typeof value === "number"
                ? 0
                : typeof value === "boolean"
                  ? false
                  : "",
          ]),
        )
      : { id: crypto.randomUUID(), title: "", body: "" };
    setItems((current) => [...current, next]);
  }

  return (
    <fieldset className="structuredList">
      <legend>{label}</legend>
      <input name={`jsonField:${fieldName}`} readOnly type="hidden" value={JSON.stringify(items)} />
      <div className="structuredListItems">
        {items.map((item, index) => (
          <article className="structuredListItem" key={String(item.id ?? index)}>
            <div className="structuredListHead">
              <strong>Item {index + 1}</strong>
              <div>
                {index > 0 && (
                  <button
                    aria-label={`Move item ${index + 1} up`}
                    className="textButton"
                    onClick={() => setItems((current) => swap(current, index, index - 1))}
                    type="button"
                  >
                    Move up
                  </button>
                )}
                {index < items.length - 1 && (
                  <button
                    aria-label={`Move item ${index + 1} down`}
                    className="textButton"
                    onClick={() => setItems((current) => swap(current, index, index + 1))}
                    type="button"
                  >
                    Move down
                  </button>
                )}
                <button
                  aria-label={`Remove item ${index + 1}`}
                  className="textButton dangerButton"
                  onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                  type="button"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="structuredListFields">
              {editableKeys.map((key) => (
                <label key={key}>
                  {humanize(key)}
                  {key === "body" || String(item[key] ?? "").length > 100 ? (
                    <textarea
                      onChange={(event) => update(index, key, event.target.value)}
                      required
                      rows={3}
                      value={String(item[key] ?? "")}
                    />
                  ) : (
                    <input
                      onChange={(event) => update(index, key, event.target.value)}
                      required
                      value={String(item[key] ?? "")}
                    />
                  )}
                </label>
              ))}
            </div>
          </article>
        ))}
        {items.length === 0 && <p className="structuredListEmpty">No items in this section.</p>}
      </div>
      <button className="secondaryButton addListItem" onClick={addItem} type="button">
        Add item
      </button>
    </fieldset>
  );
}

function parseItems(value: string): ListItem[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ListItem => Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
  } catch {
    return [];
  }
}

function fieldKeys(items: readonly ListItem[]): string[] {
  const keys = new Set(items.flatMap((item) => Object.keys(item)));
  keys.delete("id");
  return [...keys];
}

function typedValue(previous: string | number | boolean | undefined, value: string) {
  if (typeof previous === "number") return Number(value);
  if (typeof previous === "boolean") return value === "true";
  return value;
}

function swap(items: readonly ListItem[], from: number, to: number): ListItem[] {
  const next = [...items];
  const source = next[from];
  const target = next[to];
  if (!source || !target) return next;
  next[from] = target;
  next[to] = source;
  return next;
}

function humanize(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}
