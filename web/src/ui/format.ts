export function formatTokens(t: { input: number | null; output: number | null }): string {
  const f = (n: number | null) => n === null ? '未记录' : n >= 10000 ? `${(n / 10000).toFixed(1)}万` : String(n)
  return t.input === null && t.output === null ? '未记录' : `${f(t.input)} in / ${f(t.output)} out`
}
export function formatDate(iso: string): string { return iso.slice(0, 10) }
export function truncate(s: string, n: number): string { return s.length > n ? s.slice(0, n) + '…' : s }
