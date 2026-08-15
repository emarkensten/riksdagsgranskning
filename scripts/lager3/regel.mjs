/**
 * Efterkontroll som gör bedömningsreglerna strukturella i stället för att
 * lita på att modellen minns dem.
 *
 * Definitionen: en "motsägelse" föreligger bara när partiet röstade emot det
 * talaren argumenterade för UTAN att backa ett eget alternativ i samma
 * riktning. Modellen bryter ibland mot den regeln och märker något som
 * motsäger trots att den själv angett att ett eget alternativ fanns.
 *
 * I stället för att hoppas på bättre prompt nedgraderas de fallen här. Det är
 * projektets känsligaste påstående — det ska vara sant per konstruktion, inte
 * per tillit.
 */
export function tillampaRegler(bedomning) {
  const b = { ...bedomning }

  // Eget alternativ fanns => det är reservationsförfarande, inte motsägelse.
  if (b.overensstammelse === 'motsäger' && b.eget_alternativ === true) {
    b.overensstammelse = 'spänning'
    b.nedgraderad = 'eget alternativ fanns'
  }

  // Låg säkerhet duger inte för det starkaste påståendet.
  if (b.overensstammelse === 'motsäger' && b.sakerhet === 'låg') {
    b.overensstammelse = 'oklart'
    b.nedgraderad = 'låg säkerhet'
  }

  return b
}

/** Endast partier — partilösa ledamöter har ingen partilinje att avvika från. */
export function harPartilinje(parti) {
  return Boolean(parti) && parti !== '-'
}
