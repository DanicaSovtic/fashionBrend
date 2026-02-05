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
      'Možete platiti karticom ili pouzećem. Ako imate firmu, možemo poslati i račun po zahtevu.',
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

const initialMessages = [
  {
    id: 'welcome',
    from: 'bot',
    text: 'Zdravo! Tu sam za brza pitanja o porudžbinama, dostavi i povratu.',
  },
]

const normalize = (value) => value.toLowerCase().trim()

const findAnswer = (message) => {
  const normalized = normalize(message)
  if (!normalized) return null

  const matched = FAQS.find((item) =>
    item.keywords.some((keyword) => normalized.includes(keyword))
  )

  if (matched) return matched.answer

  const fallback =
    'Nisam sigurna da sam razumela. Možeš probati jedno od najčešćih pitanja ili nas kontaktirati.'

  return fallback
}

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`

const ChatBotWidget = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [showFaq, setShowFaq] = useState(true)
  const faqTimerRef = useRef(null)

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

  const sendMessage = (text) => {
    const trimmed = text.trim()
    if (!trimmed) return

    addMessage({
      id: createId('user'),
      from: 'user',
      text: trimmed,
    })

    addMessage({
      id: createId('bot'),
      from: 'bot',
      text: findAnswer(trimmed),
    })

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
        <div className="chatbot-panel" role="dialog" aria-label="Chat podrška">
          <div className="chatbot-header">
            <div>
              <p className="chatbot-title">Podrška</p>
              <p className="chatbot-subtitle">Najčešća pitanja</p>
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
          </div>

          {showFaq && (
            <div className="chatbot-faq">
              {faqButtons.map((faq) => (
                <button
                  key={faq.id}
                  type="button"
                  className="chatbot-faq-button"
                  onClick={() => handleFaqClick(faq)}
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
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  sendMessage(inputValue)
                }
              }}
            />
            <button
              type="button"
              className="chatbot-send"
              onClick={() => sendMessage(inputValue)}
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
        aria-label="Otvori chat podršku"
      >
        <span className="chatbot-visually-hidden">
          {isOpen ? 'Zatvori' : 'Otvori'} chat
        </span>
        <svg
          className="chatbot-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 3C6.48 3 2 6.8 2 11.5c0 2.71 1.55 5.12 4 6.7V22l3.55-2.05c.78.17 1.6.26 2.45.26 5.52 0 10-3.8 10-8.5S17.52 3 12 3zm0 14.5c-.78 0-1.54-.08-2.26-.24l-.6-.13-.55.32L7 18.3v-2.1l-.42-.29C4.6 14.5 3.5 13.05 3.5 11.5 3.5 7.65 7.36 4.5 12 4.5s8.5 3.15 8.5 7-3.86 7-8.5 7z" />
        </svg>
      </button>
    </div>
  )
}

export default ChatBotWidget
