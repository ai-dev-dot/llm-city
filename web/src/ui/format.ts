export function formatTokens(t: { input: number | null; output: number | null }): string {
  const f = (n: number | null) => n === null ? '未记录' : n >= 10000 ? `${(n / 10000).toFixed(1)}万` : String(n)
  return t.input === null && t.output === null ? '未记录' : `${f(t.input)} in / ${f(t.output)} out`
}
export function formatDate(iso: string): string { return iso.slice(0, 10) }
export function truncate(s: string, n: number): string { return s.length > n ? s.slice(0, n) + '…' : s }
// 模型自报文本一律经此转义再入 innerHTML（spec §7：城市数据是不可信输入，渲染层是唯一信任边界）
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
