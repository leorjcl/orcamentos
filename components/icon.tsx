const paths: Record<string, string> = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  calculator: "M5 3h14v18H5z M8 6h8v4H8z M8 14h1 M12 14h1 M16 14h1 M8 18h1 M12 18h1 M16 18h1",
  box: "m12 3 9 5v9l-9 5-9-5V8l9-5z M3 8l9 5 9-5 M12 13v9 M7 5.8l9 5",
  printer: "M7 8V3h10v5 M7 17H3V9h18v8h-4 M7 14h10v7H7z M17 11h1",
  people: "M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3 M16 4a4 4 0 0 1 0 8 M22 21v-3a4 4 0 0 0-3-3.8 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  chart: "M4 3v18h17 M8 16v-5 M13 16V7 M18 16v-8",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  plus: "M12 5v14 M5 12h14",
  clock: "M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  file: "M14 2H5v20h14V7l-5-5z M14 2v6h5 M8 12h8 M8 16h6",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  download: "M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5",
  check: "m5 12 4 4L19 6",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
};
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.file} /></svg>;
}
