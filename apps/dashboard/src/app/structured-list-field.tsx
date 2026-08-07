"use client";

import { useMemo, useState } from "react";
import { MediaPicker, type MediaPickerAsset } from "@/app/media-picker";

type ListItem = Record<string, string | number | boolean>;

export function CoordinatePickerFields({
  latitude,
  longitude,
  address,
}: {
  readonly latitude: string;
  readonly longitude: string;
  readonly address?: string | undefined;
}) {
  const [point, setPoint] = useState({ latitude, longitude });
  const [locationError, setLocationError] = useState("");
  const coordinateQuery = validPoint(point.latitude, point.longitude)
    ? `${point.latitude},${point.longitude}`
    : address || "Matrouh, Egypt";

  function useCurrentLocation() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Location access is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setPoint({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }),
      () => setLocationError("Location access was denied or could not be read."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <fieldset className="coordinatePicker">
      <legend>Google Maps location</legend>
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
      <div className="coordinateActions">
        <button className="secondaryButton" onClick={useCurrentLocation} type="button">
          Use my location
        </button>
        <a
          className="buttonLink secondaryButton"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinateQuery)}`}
          rel="noreferrer"
          target="_blank"
        >
          Open in Google Maps
        </a>
      </div>
      {locationError && <small className="fieldError">{locationError}</small>}
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
            {locationMode && (
              <LocationTools
                item={item}
                onLocate={(latitude, longitude) => {
                  update(index, "latitude", String(latitude));
                  update(index, "longitude", String(longitude));
                }}
              />
            )}
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

function LocationTools({
  item,
  onLocate,
}: {
  readonly item: ListItem;
  readonly onLocate: (latitude: number, longitude: number) => void;
}) {
  const [locationError, setLocationError] = useState("");
  const query = coordinates(item) ?? String(item.address || item.title || "Matrouh, Egypt");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  function useCurrentLocation() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Location access is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        onLocate(
          Number(position.coords.latitude.toFixed(6)),
          Number(position.coords.longitude.toFixed(6)),
        ),
      () => setLocationError("Location access was denied or could not be read."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="locationTools">
      <div className="locationToolsIcon" aria-hidden>
        <svg viewBox="0 0 24 24">
          <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" />
          <circle cx="12" cy="9" r="2.3" />
        </svg>
      </div>
      <div>
        <strong>Google Maps location</strong>
        <p>Use this device’s position or enter coordinates from Google Maps.</p>
        {locationError && <small className="fieldError">{locationError}</small>}
      </div>
      <div className="locationToolActions">
        <button className="secondaryButton" onClick={useCurrentLocation} type="button">
          Use my location
        </button>
        <a className="buttonLink secondaryButton" href={mapsUrl} rel="noreferrer" target="_blank">
          Open in Google Maps
        </a>
      </div>
    </div>
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

function coordinates(item: ListItem): string | null {
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude === 0 && longitude === 0) return null;
  return `${latitude},${longitude}`;
}

function validPoint(latitude: string, longitude: string): boolean {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
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
