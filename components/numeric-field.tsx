"use client";

import { useState } from "react";

// Keep the editing text separate: selecting/clearing a number must not insert a leading zero.
export function NumericField({ label, value, onChange, hint, min = 0, max = 1e9, integer = false, optional = false }: {
  label: string; value: number | null; onChange: (value: number | null) => void;
  hint?: string; min?: number; max?: number; integer?: boolean; optional?: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  return <label className="field">{label}<input type="text" inputMode={integer ? "numeric" : "decimal"}
    value={editing ?? (value === null ? "" : String(value).replace(".", ","))}
    required={!optional} aria-invalid={invalid || undefined} placeholder={optional ? "Ainda não medido" : undefined}
    onFocus={e => { setEditing(e.target.value); e.target.select(); }}
    onChange={e => {
      const raw = e.target.value; setEditing(raw);
      const text = raw.trim().replace(",", ".");
      const n = Number(text);
      const valid = text === "" ? optional : /^\d*\.?\d*$/.test(text) && Number.isFinite(n) && n >= min && n <= max && (!integer || Number.isInteger(n));
      const message = valid ? "" : `Informe um número ${integer ? "inteiro " : ""}entre ${min} e ${max}.`;
      e.target.setCustomValidity(message); setInvalid(!valid);
      // Native validity blocks submission; preserve the last valid value while typing.
      if (valid) onChange(text === "" && optional ? null : n);
    }}
    onBlur={() => { if (!invalid) setEditing(null); }} />{hint && <small>{hint}</small>}{invalid && <small className="input-error">Confira o valor. Use vírgula ou ponto para os decimais, sem separador de milhar.</small>}</label>;
}
