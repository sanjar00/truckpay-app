export function toCSV(data: Record<string, any>[]): string {
  if (!data.length) return ''
  const headers = Array.from(new Set(data.flatMap(obj => Object.keys(obj))))
  const escape = (val: any) => {
    if (val === null || val === undefined) return ''
    const str = String(val).replace(/"/g, '""')
    return /[",\n]/.test(str) ? `"${str}"` : str
  }
  const rows = data.map(row => headers.map(field => escape(row[field])).join(','))
  return [headers.join(','), ...rows].join('\n')
}
