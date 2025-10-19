export function classNames(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('sv-SE')
}

export function formatNumber(num: number, decimals = 0): string {
  return num.toLocaleString('sv-SE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatPercent(num: number, decimals = 1): string {
  return `${num.toLocaleString('sv-SE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`
}

export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getPartyColor(party: string): string {
  const colors: Record<string, string> = {
    S: '#E8102B', // Socialdemokraterna
    M: '#1F4788', // Moderaterna
    SD: '#DDDD00', // Sverigedemokraterna
    V: '#DA291C', // Vänsterpartiet
    MP: '#5FBB46', // Miljöpartiet
    KD: '#1A5539', // Kristdemokraterna
    L: '#00A4E4', // Liberalerna
    C: '#00A651', // Centerpartiet
    Fi: '#8B0000', // Feministiskt Initiativ
  }
  return colors[party] || '#999999'
}

export function getPartyName(party: string): string {
  const names: Record<string, string> = {
    S: 'Socialdemokraterna',
    M: 'Moderaterna',
    SD: 'Sverigedemokraterna',
    V: 'Vänsterpartiet',
    MP: 'Miljöpartiet',
    KD: 'Kristdemokraterna',
    L: 'Liberalerna',
    C: 'Centerpartiet',
    Fi: 'Feministiskt Initiativ',
  }
  return names[party] || party
}
