"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MediaPicker, type MediaPickerAsset } from "@/app/media-picker";

type StructuredValue = string | number | boolean | null | StructuredObject | StructuredValue[];
type StructuredObject = { [key: string]: StructuredValue };

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
  const blueprint = useRef<StructuredObject>(
    cloneValue(initialItems[0] ?? { id: crypto.randomUUID(), title: "", body: "" }),
  );
  const [items, setItems] = useState<StructuredObject[]>(initialItems);
  const serializedItems = JSON.stringify(items);
  const serializedField = useRef<HTMLInputElement>(null);
  const didMount = useRef(false);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    serializedField.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }, [serializedItems]);

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
      <StructuredObjectList
        blueprint={blueprint.current}
        items={items}
        label={singular(label)}
        mediaAssets={mediaAssets}
        onChange={setItems}
        websiteId={websiteId}
      />
    </fieldset>
  );
}

function StructuredObjectList({
  blueprint,
  items,
  label,
  mediaAssets,
  onChange,
  websiteId,
}: {
  readonly blueprint: StructuredObject;
  readonly items: readonly StructuredObject[];
  readonly label: string;
  readonly mediaAssets: readonly MediaPickerAsset[];
  readonly onChange: (items: StructuredObject[]) => void;
  readonly websiteId: string;
}) {
  return (
    <div className="structuredListItems">
      {items.map((item, index) => (
        <article
          className="structuredListItem"
          key={typeof item.id === "string" || typeof item.id === "number" ? item.id : index}
        >
          <div className="structuredListHead">
            <strong>
              {label} {index + 1}
            </strong>
            <div>
              {index > 0 ? (
                <button
                  aria-label={`Move ${label.toLowerCase()} ${index + 1} up`}
                  className="textButton"
                  onClick={() => onChange(swap(items, index, index - 1))}
                  type="button"
                >
                  Move up
                </button>
              ) : null}
              {index < items.length - 1 ? (
                <button
                  aria-label={`Move ${label.toLowerCase()} ${index + 1} down`}
                  className="textButton"
                  onClick={() => onChange(swap(items, index, index + 1))}
                  type="button"
                >
                  Move down
                </button>
              ) : null}
              <button
                aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
                className="textButton dangerButton"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                type="button"
              >
                Remove
              </button>
            </div>
          </div>
          <div className="structuredListFields">
            {orderedFields(item).flatMap(([key, value]) =>
              key === "id"
                ? []
                : [
                    <StructuredValueField
                      blueprint={blueprint[key]}
                      fieldKey={key}
                      key={key}
                      mediaAssets={mediaAssets}
                      onChange={(next) =>
                        onChange(
                          items.map((candidate, itemIndex) =>
                            itemIndex === index ? { ...candidate, [key]: next } : candidate,
                          ),
                        )
                      }
                      value={value}
                      websiteId={websiteId}
                    />,
                  ],
            )}
          </div>
        </article>
      ))}
      {items.length === 0 ? (
        <p className="structuredListEmpty">No {label.toLowerCase()}s yet.</p>
      ) : null}
      <button
        className="secondaryButton addListItem"
        onClick={() => onChange([...items, blankValue(blueprint) as StructuredObject])}
        type="button"
      >
        Add {label.toLowerCase()}
      </button>
    </div>
  );
}

function StructuredValueField({
  blueprint,
  fieldKey,
  mediaAssets,
  onChange,
  value,
  websiteId,
}: {
  readonly blueprint: StructuredValue | undefined;
  readonly fieldKey: string;
  readonly mediaAssets: readonly MediaPickerAsset[];
  readonly onChange: (value: StructuredValue) => void;
  readonly value: StructuredValue;
  readonly websiteId: string;
}) {
  if (fieldKey.endsWith("MediaId")) {
    return (
      <MediaPicker
        assets={mediaAssets}
        label={mediaFieldLabel(fieldKey)}
        noneLabel="Add an image"
        onChange={onChange}
        value={typeof value === "string" ? value : ""}
        websiteId={websiteId}
      />
    );
  }
  if (Array.isArray(value)) {
    const objectItems = value.filter(isStructuredObject);
    const arrayBlueprint = Array.isArray(blueprint)
      ? blueprint.find(isStructuredObject)
      : undefined;
    return (
      <fieldset className="structuredNestedList">
        <legend>{humanize(fieldKey)}</legend>
        <StructuredObjectList
          blueprint={arrayBlueprint ?? objectItems[0] ?? { id: crypto.randomUUID(), name: "" }}
          items={objectItems}
          label={singular(humanize(fieldKey))}
          mediaAssets={mediaAssets}
          onChange={onChange}
          websiteId={websiteId}
        />
      </fieldset>
    );
  }
  if (isStructuredObject(value)) {
    return (
      <fieldset className="structuredNestedGroup">
        <legend>{humanize(fieldKey)}</legend>
        {Object.entries(value).map(([key, child]) =>
          key === "id" ? null : (
            <StructuredValueField
              blueprint={isStructuredObject(blueprint) ? blueprint[key] : undefined}
              fieldKey={key}
              key={key}
              mediaAssets={mediaAssets}
              onChange={(next) => onChange({ ...value, [key]: next })}
              value={child}
              websiteId={websiteId}
            />
          ),
        )}
      </fieldset>
    );
  }
  if (typeof value === "boolean") {
    return (
      <label>
        {humanize(fieldKey)}
        <select onChange={(event) => onChange(event.target.value === "true")} value={String(value)}>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>
    );
  }
  if (fieldKey === "pricingMode") {
    return (
      <label>
        Pricing
        <select onChange={(event) => onChange(event.target.value)} value={String(value)}>
          <option value="fixed">One fixed price</option>
          <option value="variants">Sizes / variants</option>
        </select>
      </label>
    );
  }
  if (typeof value === "number") {
    return (
      <label>
        {humanize(fieldKey)}
        <input
          min={fieldKey.toLowerCase().includes("price") ? 0 : undefined}
          onChange={(event) => onChange(Number(event.target.value))}
          step={fieldKey.toLowerCase().includes("price") ? "0.01" : "any"}
          type="number"
          value={value}
        />
      </label>
    );
  }
  const textValue = typeof value === "string" ? value : "";
  const multiline =
    /description|body|note|information|extracted|review/i.test(fieldKey) || textValue.length > 100;
  return (
    <label>
      {humanize(fieldKey)}
      {multiline ? (
        <textarea onChange={(event) => onChange(event.target.value)} rows={3} value={textValue} />
      ) : (
        <input onChange={(event) => onChange(event.target.value)} value={textValue} />
      )}
    </label>
  );
}

function parseItems(value: string): StructuredObject[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isStructuredObject) : [];
  } catch {
    return [];
  }
}

function locationItem(item: StructuredObject): StructuredObject {
  return {
    ...item,
    address: item.address ?? "",
    phone: item.phone ?? "",
    hours: item.hours ?? "",
    latitude: item.latitude ?? 0,
    longitude: item.longitude ?? 0,
  };
}

function isStructuredObject(value: unknown): value is StructuredObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneValue<T extends StructuredValue>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function blankValue(value: StructuredValue): StructuredValue {
  if (typeof value === "string") return "";
  if (typeof value === "number") return 0;
  if (typeof value === "boolean") return value;
  if (value === null) return null;
  if (Array.isArray(value)) return value.length > 0 ? [blankValue(value[0]!)] : [];
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => {
      if (key === "id") return [key, crypto.randomUUID()];
      if (/^(pricingMode|locale|status|currency)$/i.test(key)) return [key, cloneValue(child)];
      if (/^(name|title)$/i.test(key)) return [key, "New item"];
      return [key, blankValue(child)];
    }),
  );
}

function swap(items: readonly StructuredObject[], from: number, to: number): StructuredObject[] {
  const next = [...items];
  const source = next[from];
  const target = next[to];
  if (!source || !target) return next;
  next[from] = target;
  next[to] = source;
  return next;
}

function mediaFieldLabel(key: string): string {
  if (key === "imageMediaId") return "Menu item photo";
  return humanize(key.replace(/MediaId$/, "")) || "Image";
}

function orderedFields(item: StructuredObject): [string, StructuredValue][] {
  const priority = (key: string): number => {
    if (/^(name|title)$/i.test(key)) return 0;
    if (key.endsWith("MediaId")) return 1;
    return 2;
  };
  return Object.entries(item).sort(([left], [right]) => priority(left) - priority(right));
}

function singular(value: string): string {
  if (/ies$/i.test(value)) return value.replace(/ies$/i, "y");
  if (/ses$/i.test(value)) return value.replace(/es$/i, "");
  if (/s$/i.test(value)) return value.slice(0, -1);
  return value || "Item";
}

function humanize(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}
