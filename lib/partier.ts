import { db, rader, tal } from '@/lib/db'
import { REGERINGSPARTIERNA } from '@/lib/parti'

/**
 * Underlaget som både /partier och /partier/[parti] bygger på.
 *
 * Ligger här därför att indexet och detaljsidan måste räkna likadant. Skulle
 * indexet säga att Socialdemokraterna röstar oftast med Liberalerna och
 * detaljsidan säga något annat vore båda värdelösa.
 */

export type Par = {
  parti_1: string
  parti_2: string
  amne: string
  gemensamma: number
  lika: number
  samstammighet: number
}

export type Franvaro = { parti: string; rm: string; roster: number; franvarande: number }

/** Ett partis samstämmighet med de sju andra, sett från partiets håll. */
export type Motpart = { parti: string; samstammighet: number; lika: number; gemensamma: number }

/**
 * Vänder paren så att det efterfrågade partiet alltid står först.
 *
 * partisamstammighet lagrar varje par en gång, med parti_1 < parti_2 i
 * bokstavsordning. Utan den här vändningen skulle ett parti bara hitta hälften
 * av sina motparter.
 */
export function motparter(par: Par[], parti: string, amne: string): Motpart[] {
  return par
    .filter((p) => p.amne === amne && (p.parti_1 === parti || p.parti_2 === parti))
    .map((p) => ({
      parti: p.parti_1 === parti ? p.parti_2 : p.parti_1,
      samstammighet: Number(p.samstammighet),
      lika: Number(p.lika),
      gemensamma: Number(p.gemensamma),
    }))
    .sort((a, b) => b.samstammighet - a.samstammighet)
}

/** Genomsnittlig samstämmighet mot de sju andra. Partiets avstånd till kammaren. */
export function snitt(rader: Motpart[]) {
  if (!rader.length) return 0
  return rader.reduce((n, r) => n + r.samstammighet, 0) / rader.length
}

/** Alla par för amne='alla' — 28 rader, nog för hela indexsidan. */
export async function hamtaAlla() {
  return rader<Par>(
    db().from('partisamstammighet')
      .select('parti_1, parti_2, amne, gemensamma, lika, samstammighet')
      .eq('amne', 'alla'),
  )
}

/**
 * Sant för de tre partier som röstar så lika att deras sidor annars ser
 * trasiga ut. Förbehållet måste stå överst på dem, inte i en fotnot.
 */
export function utbytbart(parti: string) {
  return REGERINGSPARTIERNA.some((p) => p === parti)
}

/**
 * Spannet inom regeringsblocket, som en färdig sträng: "99,9–100,0 %".
 *
 * Ligger här därför att fem sidor skriver ut det — startsidan, metodsidan,
 * ämnessidan, partisidan och samstämmighetssidan. Talet stod tidigare
 * hårdkodat som "99,9–100 %" på tre av dem, och när härledningen infördes
 * kopierades den i stället för att delas.
 *
 * Frågan måste ställas för sig. Att sila fram paren ur ett partiskopat svar
 * ger bara två av tre — det gav KD-sidan spannet 99,9–99,9 %.
 */
export async function regeringsspann() {
  const block = await rader<{ samstammighet: number }>(
    db().from('partisamstammighet').select('samstammighet').eq('amne', 'alla')
      .in('parti_1', REGERINGSPARTIERNA).in('parti_2', REGERINGSPARTIERNA),
  )
  const v = block.map((b) => Number(b.samstammighet))
  return v.length ? `${tal(Math.min(...v))}–${tal(Math.max(...v))} %` : '—'
}
