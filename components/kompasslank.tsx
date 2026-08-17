import { KOMPASS } from '@/lib/fragor'

/**
 * Källan till urvalet, som länk.
 *
 * Står på tre ställen — raden under ingressen på indexet, "Om urvalet" längst
 * ned och källraden i varje frågesidas hero — därför att en läsare som blir
 * misstänksam ska hitta avsändaren på det ställe hen blev det, inte på ett
 * annat. Tre kopior av samma URL och samma etikett vore tre chanser att ändra
 * två av dem.
 *
 * **Serverkomponent.** `lib/fragor` importerar `lib/db`, som i sin tur har
 * `@supabase/supabase-js` som statisk import. Den första klientkomponent som
 * importerar den här filen drar därför in ~40 kB i sin bundle. Behövs länken
 * i klientkod: flytta `KOMPASS` till en egen modul utan db-beroende först.
 *
 * Alltid `--black`, oavsett vad omgivningen står i. Källraden i heron är
 * `--black-svag` — en länk som ärvde det hade varit tonad grå med
 * understrykning, vilket läser som utgråad text.
 *
 * Klasserna är repots idiom för länk i löptext, ordagrant. Den stod med en
 * `transition-opacity` som ingen av de tio andra har, och två länkar i samma
 * stycke tonade då olika fort vid hover.
 */
export function Kompasslank() {
  return (
    <a
      href={KOMPASS.url}
      target="_blank"
      rel="noreferrer"
      className="underline hover:opacity-70"
      style={{ color: 'var(--black)' }}
    >
      {KOMPASS.namn}
    </a>
  )
}
