export type Lang = 'en' | 'ko';

export type Strings<T> = Record<Lang, T>;

// Fills {name} placeholders. Unknown names stay visible — a loud bug beats a silent blank.
export const tmpl = (s: string, vars: Record<string, string | number>): string =>
  s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
