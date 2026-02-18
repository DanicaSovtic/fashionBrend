/**
 * Piccola Girl chatbot – LLM endpoint
 * Prioritet: 1) Groq (besplatno, bez kartice) 2) Gemini 3) OpenAI
 * API ključevi ostaju bezbedni na backend-u
 */

import { Router } from 'express'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

const router = Router()

const callOpenAIFormat = async (client, messages, model) => {
  const completion = await client.chat.completions.create({
    model,
    messages,
    max_tokens: 300,
    temperature: 0.7,
  })
  return completion.choices?.[0]?.message?.content?.trim()
}

const CHAT_SYSTEM_PROMPT = `Ti si Piccola Girl, virtuelna asistentkinja modnog brenda Piccola. Tvoj zadatak je da pružiš prijateljsku, mladalačku ali profesionalnu podršku kupcima.

PRAVILA:
1. Odgovaraj isključivo na pitanja vezana za modu, Piccola brend, kupovinu, dostavu, povrat, veličine, plaćanje i slične teme.
2. Ako korisnik pita nešto van teme (politika, zdravlje, sport, lični saveti itd.), ljubazno preusmeri na temu brenda: "Radujem se što želiš da razgovaramo! Ja sam tu za pitanja o Piccoli – moda, porudžbine, dostava, povrat. Kako mogu da pomognem?"
3. Budi prijateljska, topla, moderan ton. Koristi srpski jezik.
4. Budi koncizna – 2–4 rečenice u proseku, osim ako korisnik traži detalje.
5. Ne izmišljaj informacije. Ako ne znaš tačan odgovor, predloži kontakt: "Za precizne informacije, najbolje je da nas kontaktiraš putem forme na stranici Kontakt."
6. Ne davaj finansijske, medicinske ili pravne savete.
7. Ne razgovaraj o konkurentima ili drugim brendovima.
8. Uvek ostani u ulozi Piccola Girl – brend asistentkinja.`

/**
 * Provera da li je pitanje relevantno za chatbot (osnovna moderacija)
 */
const isOnTopic = (text) => {
  const normalized = text.toLowerCase().trim()
  const offTopicPatterns = [
    /politik|izbor|glasaj|stranka|vlada/i,
    /kako da ubijem|samoubistv|ubistv/i,
    /droga|narkotik|kockanje/i,
    /hakuj|exploit|malware/i,
    /kredit|hipoteka|investicij/i,
    /dijagnoza|bolest|lekar|recept/i,
    /nauči me programirati|nauči me kod/i,
  ]
  const onTopicKeywords = [
    'piccola', 'moda', 'kupovina', 'porudžbin', 'dostav', 'povrat', 'veličin',
    'plaćanj', 'proizvod', 'artikal', 'katalog', 'kolekcij', 'brend',
    'cena', 'akcija', 'popust', 'poklon', 'kontakt', 'pitanje',
    'zdravo', 'ćao', 'pomozi', 'pomoć', 'informacij',
  ]
  if (offTopicPatterns.some((p) => p.test(normalized))) return false
  if (onTopicKeywords.some((k) => normalized.includes(k))) return true
  return true
}

router.post('/chat', async (req, res, next) => {
  try {
    const groqKey = process.env.GROQ_API_KEY
    const geminiKey = process.env.GEMINI_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    if (!groqKey && !geminiKey && !openaiKey) {
      res.status(503).json({
        error: 'Chat servis nije dostupan. Dodajte GROQ_API_KEY (besplatno na console.groq.com) u .env.',
      })
      return
    }

    const { message, history = [] } = req.body
    const userMessage = typeof message === 'string' ? message.trim() : ''

    if (!userMessage) {
      res.status(400).json({ error: 'Pitanje je obavezno.' })
      return
    }

    if (!isOnTopic(userMessage)) {
      res.status(400).json({
        error:
          'Radujem se razgovoru! Ja sam tu za pitanja o Piccoli – moda, porudžbine, dostava, povrat. Kako mogu da pomognem?',
      })
      return
    }

    const recentHistory = history
      .slice(-10)
      .map((m) => ({
        role: m.from === 'user' ? 'user' : m.from === 'bot' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }))
      .filter((h, i, arr) => {
        const firstUserIdx = arr.findIndex((x) => x.role === 'user')
        return firstUserIdx === -1 || i >= firstUserIdx
      })

    const messages = [
      { role: 'system', content: CHAT_SYSTEM_PROMPT },
      ...history.slice(-10).map((m) => ({
        role: m.from === 'user' ? 'user' : 'assistant',
        content: m.text,
      })),
      { role: 'user', content: userMessage },
    ]

    let reply

    if (groqKey) {
      const groq = new OpenAI({
        apiKey: groqKey,
        baseURL: 'https://api.groq.com/openai/v1',
      })
      try {
        reply = await callOpenAIFormat(
          groq,
          messages,
          process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
        )
      } catch (rateErr) {
        if (rateErr?.status === 429) {
          await new Promise((r) => setTimeout(r, 3000))
          reply = await callOpenAIFormat(
            groq,
            messages,
            process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
          )
        } else throw rateErr
      }
    } else if (geminiKey) {
      const genAI = new GoogleGenerativeAI(geminiKey)
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash-8b',
        systemInstruction: CHAT_SYSTEM_PROMPT,
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
      })
      const chat = model.startChat({ history: recentHistory })

      const callGemini = () => chat.sendMessage(userMessage)
      let result
      try {
        result = await callGemini()
      } catch (rateErr) {
        if (rateErr?.status === 429) {
          await new Promise((r) => setTimeout(r, 40000))
          result = await callGemini()
        } else {
          throw rateErr
        }
      }

      reply = result.response.text()?.trim()
    } else {
      const openai = new OpenAI({ apiKey: openaiKey })
      try {
        reply = await callOpenAIFormat(
          openai,
          messages,
          process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini'
        )
      } catch (rateErr) {
        if (rateErr?.status === 429) {
          await new Promise((r) => setTimeout(r, 3000))
          reply = await callOpenAIFormat(
            openai,
            messages,
            process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini'
          )
        } else throw rateErr
      }
    }

    if (!reply) {
      res.status(500).json({
        error: 'Nisam uspela da generišem odgovor. Probajte ponovo.',
      })
      return
    }

    res.json({ reply })
  } catch (error) {
    console.error('[Chat] Error:', error?.message)
    console.error('[Chat] Full error:', error)
    const msg = (error?.message || '').toLowerCase()
    const isAuthError = msg.includes('access token') || msg.includes('invalid api') || error?.status === 401 || error?.status === 403
    const isQuotaError = error?.status === 429 && (msg.includes('quota') || msg.includes('billing'))
    const status = error?.status === 429 ? 429 : isAuthError ? 503 : 500
    let fallback = 'Došlo je do greške. Koristite brza pitanja ispod ili nas kontaktirajte.'
    if (isQuotaError) {
      fallback = 'Chat trenutno nije dostupan zbog ograničenja API kvote. Koristite brza pitanja ispod ili nas kontaktirajte direktno.'
    } else if (status === 429) {
      fallback = 'Previše zahteva u kratkom vremenu. Sačekajte malo pa probajte ponovo.'
    } else if (isAuthError) {
      fallback = 'Chat servis trenutno nije dostupan. Probajte brza pitanja ispod ili nas kontaktirajte direktno.'
    }
    res.status(status).json({ error: fallback })
  }
})

export default router
