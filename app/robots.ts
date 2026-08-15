import type { MetadataRoute } from 'next'
import { SAJT_URL } from '@/lib/sajt'

/**
 * Allt är öppet. Materialet är riksdagens egna offentliga handlingar, och
 * sajtens hållning är att räkningen ska gå att kontrollera — då vore det
 * motsägelsefullt att stänga ute den som vill läsa den maskinellt.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    // Ingen `host`: direktivet läses bara av Yandex och ska dessutom vara ett
    // värdnamn utan schema. Next skriver ut SAJT_URL rakt av, alltså en rad som
    // inte följer formatet.
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SAJT_URL}/sitemap.xml`,
  }
}
