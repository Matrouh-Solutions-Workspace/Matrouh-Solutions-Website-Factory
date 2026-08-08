"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MediaPicker, type MediaPickerAsset } from "@/app/media-picker";

type ListItem = Record<string, string | number | boolean>;

export function CoordinatePickerFields({
  latitude,
  longitude,
}: {
  readonly latitude: string;
  readonly longitude: string;
}) {
  const [point, setPoint] = useState({ latitude, longitude });

  return (
    <fieldset className="coordinatePicker">
      <legend>Map coordinates</legend>
      <p>Enter the exact latitude and longitude for this location.</p>
      <div className="coordinateInputs">
        <label>
          Latitude
          <input
            name="jsonField:latitude"
            onChange={(event) =>
              setPoint((current) => ({ ...current, latitude: event.target.value }))
            }
            step="any"
            type="number"
            value={point.latitude}
          />
        </label>
        <label>
          Longitude
          <input
            name="jsonField:longitude"
            onChange={(event) =>
              setPoint((current) => ({ ...current, longitude: event.target.value }))
            }
            step="any"
            type="number"
            value={point.longitude}
          />
        </label>
      </div>
    </fieldset>
  );
}

export function StructuredListField({
  fieldName,
  initialJson,
  label,
  locationMode = false,
  mediaAssets = [],
  websiteId,
}: {
  readonly fieldName: string;
  readonly initialJson: string;
  readonly label: string;
  readonly locationMode?: boolean;
  readonly mediaAssets?: readonly MediaPickerAsset[];
  readonly websiteId: string;
}) {
  const initialItems = useMemo(
    () => parseItems(initialJson).map((item) => (locationMode ? locationItem(item) : item)),
    [initialJson, locationMode],
  );
  const [items, setItems] = useState<ListItem[]>(initialItems);
  const serializedItems = JSON.stringify(items);
  const serializedField = useRef<HTMLInputElement>(null);
  const didMount = useRef(false);
  const editableKeys = useMemo(() => fieldKeys(items), [items]);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    serializedField.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }, [serializedItems]);

  function update(index: number, key: string, value: string) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: typedValue(item[key], value) } : item,
      ),
    );
  }

  function addItem() {
    const sample = items[0];
    let next: ListItem = sample
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
    if (locationMode) next = locationItem(next);
    setItems((current) => [...current, next]);
  }

  return (
    <fieldset className="structuredList">
      <legend>{label}</legend>
      <input
        data-autosave
        name={`jsonField:${fieldName}`}
        readOnly
        ref={serializedField}
        type="hidden"
        value={serializedItems}
      />
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
              {editableKeys.map((key) =>
                key.endsWith("MediaId") ? (
                  <MediaPicker
                    assets={mediaAssets}
                    key={key}
                    label={mediaFieldLabel(key)}
                    onChange={(nextValue) => update(index, key, nextValue)}
                    value={String(item[key] ?? "")}
                    websiteId={websiteId}
                  />
                ) : (
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
                        inputMode={
                          key === "latitude" || key === "longitude" ? "decimal" : undefined
                        }
                        onChange={(event) => update(index, key, event.target.value)}
                        required={
                          key !== "latitude" && key !== "longitude" && !key.endsWith("MediaId")
                        }
                        step={key === "latitude" || key === "longitude" ? "any" : undefined}
                        type={key === "latitude" || key === "longitude" ? "number" : "text"}
                        value={String(item[key] ?? "")}
                      />
                    )}
                  </label>
                ),
              )}
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

function mediaFieldLabel(key: string): string {
  const withoutInternalSuffix = key.replace(/MediaId$/, "");
  return humanize(withoutInternalSuffix) || "Image";
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

function locationItem(item: ListItem): ListItem {
  return {
    ...item,
    address: item.address ?? "",
    phone: item.phone ?? "",
    hours: item.hours ?? "",
    latitude: item.latitude ?? 0,
    longitude: item.longitude ?? 0,
  };
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
