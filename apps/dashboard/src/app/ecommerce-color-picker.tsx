"use client";

import { useState } from "react";

export function EcommerceColorPicker({
  defaultValue = ["#111827"],
  name,
}: {
  readonly defaultValue?: readonly string[];
  readonly name: string;
}) {
  const [colors, setColors] = useState(() =>
    defaultValue.map((color, index) => ({
      id: `${name}-${index}`,
      color,
    })),
  );
  return (
    <div className="commerceColorPicker">
      <div className="commerceColorPickerList">
        {colors.map((entry, index) => (
          <div className="commerceColorPickerItem" key={entry.id}>
            <input
              aria-label={`Product color ${index + 1}`}
              name={name}
              onChange={(event) =>
                setColors((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, color: event.target.value } : item,
                  ),
                )
              }
              type="color"
              value={entry.color}
            />
            <button
              aria-label="Remove color"
              onClick={() =>
                setColors((current) => current.filter((_, itemIndex) => itemIndex !== index))
              }
              type="button"
            >
              ×
            </button>
          </div>
        ))}
        <button
          className="commerceColorPickerAdd"
          onClick={() =>
            setColors((current) => [
              ...current,
              { id: `${name}-${crypto.randomUUID()}`, color: "#f5a623" },
            ])
          }
          type="button"
        >
          +
        </button>
      </div>
      <small>Choose any color, add more, or remove colors.</small>
    </div>
  );
}
