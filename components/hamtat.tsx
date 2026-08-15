import { datum, db, rader } from '@/lib/db'

/**
 * När datan senast hämtades, i sidfoten på varje sida.
 *
 * Sajten uppdateras inte automatiskt, och ett material vars ålder inte syns
 * läses som färskt. Talet härleds ur `ledamot.uppdaterad` — samma källa som
 * metodsidan använder — och står alltså aldrig skrivet någonstans.
 */
export async function Hamtat() {
  const hamtat = await senast()
  if (!hamtat) return null
  return (
    <>
      {' '}
      Hämtat {datum(hamtat)}, och sedan dess oförändrat — sajten uppdateras inte
      automatiskt.
    </>
  )
}

/**
 * Ett fel här får inte fälla sidan.
 *
 * `rader()` kastar med flit: en avbruten fråga ska aldrig bli en tyst nolla i
 * ett tal sajten påstår något med. Men det här är sidfotens datum på *varje*
 * sida, och en databashicka skulle annars ta ned hela sajten i stället för en
 * mening. Att utelämna meningen är inte ett felaktigt tal — det är att låta
 * bli att påstå något, vilket är samma hållning som resten av sajten.
 */
async function senast() {
  try {
    const r = await rader<{ uppdaterad: string }>(
      db().from('ledamot').select('uppdaterad').order('uppdaterad', { ascending: false }).limit(1),
    )
    return r[0]?.uppdaterad
  } catch {
    return undefined
  }
}
