import React, { useEffect, useMemo, useRef, useState } from 'react'
import './ChatBotWidget.css'

const FAQS = [
  {
    id: 'delivery',
    question: 'Kada stiže porudžbina?',
    answer:
      'Dostava traje 2–5 radnih dana. Status pošiljke šaljemo mejlom čim pošaljemo paket.',
    keywords: ['dostava', 'isporuka', 'porudžb', 'stig', 'kurir'],
  },
  {
    id: 'payment',
    question: 'Koje načine plaćanja prihvatate?',
    answer:
      'Kao savremeni modni brend koji prati trendove ne samo u dizajnu već i u tehnologiji, omogućavamo vam fleksibilne i moderne načine plaćanja. Kupovinu možete izvršiti pouzećem, što znači da porudžbinu plaćate prilikom preuzimanja paketa, brzo i jednostavno. Takođe, pratimo digitalne inovacije, pa nudimo mogućnost plaćanja putem MetaMask novčanika ili Gift kartice, omogućavajući sigurnu i savremenu kripto transakciju za sve koji preferiraju Web3 način plaćanja. Naš cilj je da vam pružimo jednostavno, bezbedno i moderno iskustvo kupovine — od izbora proizvoda do finalnog plaćanja. ✨',
    keywords: ['plaćanje', 'kartica', 'pouzeć', 'račun', 'uplata'],
  },
  {
    id: 'return',
    question: 'Kako funkcioniše povrat?',
    answer:
      'Povrat je moguć u roku od 14 dana, uz nekorišćen artikal i originalnu ambalažu.',
    keywords: ['povrat', 'reklam', 'odustaj', 'zamena', 'refund'],
  },
  {
    id: 'sizes',
    question: 'Kako da izaberem veličinu?',
    answer:
      'U opisu proizvoda je tabela veličina. Ako ste između dve veličine, obično preporučujemo veću.',
    keywords: ['veličin', 'size', 'tabela', 'mera'],
  },
  {
    id: 'availability',
    question: 'Da li je proizvod dostupan?',
    answer:
      'Na stranici proizvoda piše dostupnost. Ako nema stanja, prijavite se za obaveštenje.',
    keywords: ['dostupan', 'stanje', 'rasprodat', 'dostupnost'],
  },
  {
    id: 'support',
    question: 'Kako da kontaktiram podršku?',
    answer:
      'Najbrže je putem forme na stranici Kontakt ili na mejl koji je naveden u kontaktu.',
    keywords: ['kontakt', 'podrš', 'pitanj', 'email', 'mejl'],
  },
]

const FALLBACK_ANSWER =
  'Nisam sigurna da sam razumela. Možeš probati jedno od najčešćih pitanja ili nas kontaktirati.'

const initialMessages = [
  {
    id: 'welcome',
    from: 'bot',
    text: 'Zdravo! Ja sam Piccola Girl. Tu sam za pitanja o porudžbinama, dostavi, povratu i sve vezano za Piccola brend.',
  },
]

const PICCOLA_GIRL_IMAGE =
  'https://i.pinimg.com/736x/cd/86/71/cd8671b350d6daa7371abcee3bbeb200.jpg'

const FallbackIcon = () => (
  <svg
    className="chatbot-fallback-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M12 3C6.48 3 2 6.8 2 11.5c0 2.71 1.55 5.12 4 6.7V22l3.55-2.05c.78.17 1.6.26 2.45.26 5.52 0 10-3.8 10-8.5S17.52 3 12 3zm0 14.5c-.78 0-1.54-.08-2.26-.24l-.6-.13-.55.32L7 18.3v-2.1l-.42-.29C4.6 14.5 3.5 13.05 3.5 11.5 3.5 7.65 7.36 4.5 12 4.5s8.5 3.15 8.5 7-3.86 7-8.5 7z" />
  </svg>
)

const normalize = (value) => value.toLowerCase().trim()

const findAnswer = (message) => {
  const normalized = normalize(message)
  if (!normalized) return null

  const matched = FAQS.find((item) =>
    item.keywords.some((keyword) => normalized.includes(keyword))
  )

  if (matched) return { answer: matched.answer, fromFaq: true }
  return { answer: FALLBACK_ANSWER, fromFaq: false }
}

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`

const ChatBotWidget = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [showFaq, setShowFaq] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const faqTimerRef = useRef(null)
  const messagesEndRef = useRef(null)

  const faqButtons = useMemo(
    () =>
      FAQS.map((item) => ({
        id: item.id,
        question: item.question,
        answer: item.answer,
      })),
    []
  )

  const addMessage = (nextMessage) => {
    setMessages((prev) => [...prev, nextMessage])
  }

  const hideFaqTemporarily = () => {
    setShowFaq(false)
    if (faqTimerRef.current) {
      clearTimeout(faqTimerRef.current)
    }
    faqTimerRef.current = setTimeout(() => {
      setShowFaq(true)
    }, 6000)
  }

  const fetchLLMReply = async (userText, history) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: history.slice(-10),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        return data?.error || 'Došlo je do greške. Probajte brza pitanja ispod.'
      }
      return data.reply
    } catch (err) {
      return 'Servis trenutno nije dostupan. Koristite brza pitanja ispod ili nas kontaktirajte.'
    }
  }

  const sendMessage = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    addMessage({
      id: createId('user'),
      from: 'user',
      text: trimmed,
    })

    const { answer, fromFaq } = findAnswer(trimmed)

    if (fromFaq) {
      addMessage({
        id: createId('bot'),
        from: 'bot',
        text: answer,
      })
    } else {
      setIsLoading(true)
      const llmReply = await fetchLLMReply(trimmed, messages)
      addMessage({
        id: createId('bot'),
        from: 'bot',
        text: llmReply,
      })
      setIsLoading(false)
    }

    setInputValue('')
    hideFaqTemporarily()
  }

  const handleFaqClick = (faq) => {
    addMessage({
      id: createId('user'),
      from: 'user',
      text: faq.question,
    })
    addMessage({
      id: createId('bot'),
      from: 'bot',
      text: faq.answer,
    })
    hideFaqTemporarily()
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (isOpen) {
      setShowFaq(true)
    }
  }, [isOpen])

  useEffect(
    () => () => {
      if (faqTimerRef.current) {
        clearTimeout(faqTimerRef.current)
      }
    },
    []
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    sendMessage(inputValue)
  }

  return (
    <div className="chatbot-container" aria-live="polite">
      {isOpen && (
        <div className="chatbot-panel" role="dialog" aria-label="Piccola Girl chat">
          <div className="chatbot-header">
            <div>
              <p className="chatbot-title">Piccola Girl</p>
              <p className="chatbot-subtitle">Tvoja virtuelna asistentkinja</p>
            </div>
            <button
              type="button"
              className="chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Zatvori chat"
            >
              ✕
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chatbot-message chatbot-message--${message.from}`}
              >
                {message.text}
              </div>
            ))}
            {isLoading && (
              <div className="chatbot-message chatbot-message--bot chatbot-message--typing">
                <span className="chatbot-typing-dot" />
                <span className="chatbot-typing-dot" />
                <span className="chatbot-typing-dot" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {showFaq && (
            <div className="chatbot-faq">
              {faqButtons.map((faq) => (
                <button
                  key={faq.id}
                  type="button"
                  className="chatbot-faq-button"
                  onClick={() => handleFaqClick(faq)}
                  disabled={isLoading}
                >
                  {faq.question}
                </button>
              ))}
            </div>
          )}

          <form className="chatbot-form" onSubmit={handleSubmit}>
            <input
              type="text"
              className="chatbot-input"
              placeholder="Postavi pitanje..."
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="chatbot-send"
              disabled={isLoading}
            >
              Pošalji
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="chatbot-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Otvori Piccola Girl chat"
      >
        <span className="chatbot-visually-hidden">
          {isOpen ? 'Zatvori' : 'Otvori'} chat
        </span>
        {avatarError ? (
          <span className="chatbot-avatar-fallback">
            <FallbackIcon />
          </span>
        ) : (
          <img
            src={PICCOLA_GIRL_IMAGE}
            alt="Piccola Girl"
            className="chatbot-avatar"
            onError={() => setAvatarError(true)}
          />
        )}
      </button>
    </div>
  )
}

export default ChatBotWidget
