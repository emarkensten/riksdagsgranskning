/**
 * Lager 3: jämför vad en talare krävde med hur partiet röstade.
 *
 * Detta är projektets känsligaste steg. Fables ursprungliga idé — hitta
 * enskilda ledamöter som säger ett och röstar ett annat — visade sig omöjlig:
 * bara 0,14 % av rösterna avviker från det egna partiet. Historien finns på
 * PARTINIVÅ, och bara om reservationsfällan hanteras.
 *
 * Fällan: i en svensk votering ställs utskottets förslag mot en reservation.
 * Ett parti som talar för mer resurser till skolan och sedan röstar nej har
 * oftast röstat för SIN EGEN reservation om mer resurser till skolan. Det är
 * inte hyckleri, det är procedur.
 *
 * Därför är `eget_alternativ` fältet allt vilar på. Bara när ett parti röstar
 * emot det den argumenterat för UTAN att backa ett eget förslag i samma
 * riktning finns något att rapportera.
 */

export const SYSTEM = `Du jämför vad en riksdagsledamot argumenterade för i en debatt med hur
ledamotens parti sedan röstade i samma ärende.

DETTA MÅSTE DU FÖRSTÅ, ANNARS BLIR SVAREN FEL:
I riksdagen ställs utskottets förslag mot EN reservation. Ett parti som
argumenterar för mer pengar till skolan och sedan röstar nej har nästan alltid
röstat för sin EGEN reservation om mer pengar till skolan. Det är normal
procedur, inte en motsägelse.

En verklig motsägelse föreligger bara när partiet röstade emot det talaren
argumenterade för UTAN att stå bakom något eget alternativ i samma riktning.
Du får veta vilka partier som stod bakom motförslaget och reservationerna —
använd den uppgiften.

Din uppgift per förslagspunkt som talaren faktiskt berör:
1. Sammanfatta vad talaren konkret krävde i den frågan.
2. Bedöm hur det förhåller sig till partiets röst.
3. Ange om talaren pekade på ett eget alternativ (egen reservation, eget
   budgetförslag, egen motion).

BEDÖMNINGSSKALAN:
- "stämmer": talarens krav och partiets röst pekar åt samma håll.
- "spänning": talaren betonade något partiets röst inte levererade, men
  partiet stod bakom ett eget alternativ i den riktningen.
- "motsäger": partiet röstade emot det talaren argumenterade för, UTAN eget
  alternativ i samma riktning. Använd denna sparsamt och bara när du är säker.
- "oklart": talaren berörde frågan för vagt för att bedöma.

Var återhållsam. Det är bättre att svara "oklart" än att påstå en motsägelse
som inte håller. Behandla bara förslagspunkter talaren faktiskt uttalar sig om
— hoppa över resten.

Beskriv, värdera inte. Skriv inte att någon är hycklande eller oärlig.`

export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['bedomningar'],
  properties: {
    bedomningar: {
      type: 'array',
      description: 'En post per förslagspunkt talaren faktiskt berör. Tom lista är ett giltigt svar.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['punkt', 'talarens_krav', 'overensstammelse', 'eget_alternativ', 'motivering', 'sakerhet'],
        properties: {
          punkt: { type: 'string', description: 'Förslagspunktens nummer.' },
          talarens_krav: { type: 'string', description: 'Vad talaren konkret krävde. En mening.' },
          overensstammelse: { type: 'string', enum: ['stämmer', 'spänning', 'motsäger', 'oklart'] },
          eget_alternativ: {
            type: 'boolean',
            description: 'Pekade talaren på partiets eget alternativ i frågan?',
          },
          motivering: { type: 'string', description: 'Kort skäl till bedömningen. En till två meningar.' },
          sakerhet: { type: 'string', enum: ['låg', 'medel', 'hög'] },
        },
      },
    },
  },
}

export function byggUserPrompt(rad) {
  const delar = [
    `DEBATT OM: ${rad.bet_titel ?? ''} (${rad.beteckning}, ${rad.rm})`,
    `TALARE: ${rad.talare} — parti ${rad.parti}`,
    '',
    'FÖRSLAGSPUNKTER SOM RÖSTADES OM I ÄRENDET:',
  ]

  for (const p of rad.punkter) {
    delar.push(
      '',
      `— Punkt ${p.punkt}: ${p.rubrik ?? ''}`,
      `  Sakfråga: ${p.sakfraga}`,
      `  Ja innebar: ${p.ja_innebar}`,
      `  Nej innebar: ${p.nej_innebar}`,
      `  ${rad.parti} röstade: ${p.partiets_rost ?? 'okänt'}`,
      `  Motförslaget stöddes av: ${p.motforslag_partier?.join(', ') || 'ingen uppgift'}`,
      `  Reservationer på punkten från: ${p.reservationspartier?.join(', ') || 'inga'}`,
    )
  }

  delar.push(
    '',
    'ANFÖRANDET:',
    (rad.text || '').slice(0, 14000),
  )
  return delar.join('\n')
}
