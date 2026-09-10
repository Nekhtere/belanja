/**
 * Admin chat.
 *
 * A sheet of glass that slides in from the right, matching CartDrawer — same
 * scrim, same Escape handling, same scroll lock, same focus move. Two panels
 * that behave differently for no reason is how an interface starts feeling
 * assembled rather than designed, so the shared behaviour is copied rather
 * than reinvented.
 *
 * WHAT THIS IS NOT
 *
 * There is no backend, so nobody is on the other end. The assistant says so
 * itself in the first bubble and is named "Asisten RUPA" rather than given a
 * human name. Everything it "knows" is derived from the catalogue and the
 * stock table — see data/chat.js for why the stock answer in particular must
 * be generated rather than written.
 *
 * The typing indicator is a deliberate small fiction: it is a 600ms delay
 * before a reply that is already known. That is a UI convention the reader
 * understands, and it makes the reply land as a reply. A fake human typing for
 * ten seconds would be a different thing entirely, which is why the delay is
 * short and the assistant is labelled automatic.
 *
 * The stock line at the top is the point of the whole feature: it is the one
 * place where the page admits its own data might be out of date, and gives the
 * shopper a way to ask. Everything else in this panel exists to support it.
 */

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { EASE } from '../lib/motion'
import { greeting, replyFor, intentFromText, QUICK_REPLIES } from '../data/chat'
import { stockLabel, stockAge } from '../data/stock'

/** One bubble. Mine align right, the assistant's left. */
function Bubble({ from, children }) {
  const mine = from === 'me'
  return (
    <li className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-[18px] px-3.5 py-2.5 text-[0.8125rem] leading-relaxed ${
          mine
            ? 'bg-ink text-paper'
            : 'border border-line bg-paper text-ink'
        }`}
      >
        {children}
      </div>
    </li>
  )
}

/** Three dots that pulse while the reply is "being written". */
function Typing() {
  return (
    <li className="flex justify-start" aria-hidden="true">
      <div className="flex gap-1 rounded-[18px] border border-line bg-paper px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
            className="size-1.5 rounded-full bg-muted"
          />
        ))}
      </div>
    </li>
  )
}

export default function AdminChat({ open, onClose, product, stock }) {
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState(false)
  const [text, setText] = useState('')
  const closeRef = useRef(null)
  const listRef = useRef(null)
  const idRef = useRef(0)
  // Pending reply timers, so closing the panel can cancel them. Declared here
  // rather than beside the cleanup effect below because `send` closes over it.
  const timers = useRef([])

  // Reset the conversation whenever the product changes, so a chat opened on
  // one product never carries its history onto the next one.
  //
  // Keyed on `product.id`, not on the `product`/`stock` objects. Those are
  // rebuilt on every render, so depending on them would wipe the conversation
  // on any state change — including the one that adds a message to it.
  useEffect(() => {
    if (!open) return
    idRef.current = 0
    setMessages([{ id: 0, from: 'admin', text: greeting(product, stock) }])
    setTyping(false)
    setText('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product.id])

  // Escape to close, and lock the page behind the panel — same as the cart.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  useEffect(() => {
    if (open) closeRef.current?.focus()
  }, [open])

  // Follow the newest message. Setting `scrollTop` on the list rather than
  // calling scrollIntoView keeps the page itself from being dragged along.
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, typing])

  /** Send a message and queue the canned answer behind a short delay. */
  const send = (body, intent) => {
    const clean = body.trim()
    if (!clean || typing) return
    const mineId = ++idRef.current
    setMessages((prev) => [...prev, { id: mineId, from: 'me', text: clean }])
    setText('')
    setTyping(true)

    const resolved = intent ?? intentFromText(clean)
    const bubbles = replyFor(resolved, product, stock)

    // Keep the pending timer so closing the panel mid-reply cannot land a
    // message in a conversation that has already been reset.
    const t = setTimeout(() => {
      setTyping(false)
      setMessages((prev) => [
        ...prev,
        ...bubbles.map((b) => ({ id: ++idRef.current, from: 'admin', text: b })),
      ])
    }, 600)
    timers.current.push(t)
  }

  // Cancel anything still pending when the panel closes, and on unmount.
  useEffect(() => {
    if (open) return
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [open])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const label = stockLabel(stock)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="chat"
          initial="closed"
          animate="open"
          exit="closed"
          className="fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          aria-label={`Chat dengan admin tentang ${product.name}`}
        >
          <motion.button
            type="button"
            onClick={onClose}
            aria-label="Tutup chat"
            variants={{ closed: { opacity: 0 }, open: { opacity: 1 } }}
            transition={{ duration: 0.35, ease: EASE }}
            className="absolute inset-0 cursor-default bg-ink/20 backdrop-blur-[3px]"
          />

          <motion.div
            variants={{ closed: { x: '104%' }, open: { x: 0 } }}
            transition={{ duration: 0.5, ease: EASE }}
            className="glass-strong absolute inset-y-2 right-2 flex w-[calc(100%-1rem)] max-w-[26rem] flex-col overflow-hidden rounded-[24px] md:inset-y-3 md:right-3 md:w-[26rem]"
          >
            {/* --- header --- */}
            <div className="flex items-start justify-between gap-3 border-b border-ink/5 px-5 py-4">
              <div className="min-w-0">
                <h2 className="type-h3 text-[1rem]">Asisten RUPA</h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-[0.75rem] type-muted">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-sale" />
                  Balasan otomatis · bukan admin manusia
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="grid size-10 shrink-0 place-items-center rounded-full transition-colors duration-200 hover:bg-ink/5"
                aria-label="Tutup"
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  ×
                </span>
              </button>
            </div>

            {/* --- the stock line ---
                The reason this panel exists. It states the reading AND its
                age, and when the reading is old it says so in words rather
                than only through a colour. */}
            <div data-stock-line className="border-b border-ink/5 px-5 py-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem]">
                <span className="type-muted">{product.name}</span>
                <span className="text-faint">·</span>
                <span className="font-medium">{label.label}</span>
                <span className="text-faint">· {stockAge(stock)}</span>
              </div>
              {stock.stale && (
                <p className="mt-1.5 text-[0.75rem] text-sale">
                  Catatan ini sudah lama, jadi bisa saja sudah berubah.
                </p>
              )}
            </div>

            {/* --- messages --- */}
            <ul
              ref={listRef}
              aria-live="polite"
              aria-relevant="additions"
              className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4"
            >
              {messages.map((m) => (
                <Bubble key={m.id} from={m.from}>
                  {m.text}
                </Bubble>
              ))}
              {typing && <Typing />}
            </ul>

            {/* --- quick replies --- */}
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => send(q.label, q.id)}
                  disabled={typing}
                  className="rounded-full border border-line-strong bg-paper/70 px-3 py-1.5 text-[0.75rem] transition-colors duration-200 hover:border-ink disabled:opacity-40"
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* --- composer --- */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                send(text)
              }}
              className="flex items-center gap-2 border-t border-ink/5 px-4 py-3"
            >
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tulis pertanyaan…"
                aria-label="Pesan untuk admin"
                className="field min-w-0 flex-1"
              />
              <button
                type="submit"
                disabled={!text.trim() || typing}
                className="btn btn-ink shrink-0 px-4 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Kirim
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
