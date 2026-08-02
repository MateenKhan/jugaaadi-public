/**
 * @jugaaadi/ai-providers — the registry, and a harness for your own keys.
 *
 * Two halves:
 *   1. Every provider in the package's registry, free tiers first, with an
 *      honest verdict on whether a browser can call it at all (./ai-providers.cors).
 *   2. A test bench: connect a key, run one canned prompt, see whether that key
 *      still works and how fast it is. Several providers can be queued so you
 *      can sweep a drawer full of half-forgotten keys in one go.
 *
 * ── Where keys go ──────────────────────────────────────────────────────────
 * Nowhere but the provider. This page is static files behind nginx; there is no
 * backend to send anything to, and no analytics on the site. A key is read out
 * of the encrypted vault at call time, handed to the AI SDK, and dropped — it is
 * never held in React state, never put in a URL, never logged. The only network
 * request carrying it is the one the AI SDK makes to that provider's own API.
 *
 * Everything key-shaped is the package's own code: `createKeyVault` for storage,
 * `<AIConnectModal>` for entry, `generateWithMeta` for the call. This file
 * reimplements none of it — that is the point of the library.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  PROVIDERS,
  createKeyVault,
  generateWithMeta,
  isVaultSupported,
  type AIProvider,
  type KeyVault,
} from '@jugaaadi/ai-providers'
import { AIConnectModal } from '@jugaaadi/ai-providers/ui'
import { ACCESS_LABEL, PROBED_ON, browserAccess, type BrowserAccess } from './ai-providers.cors'
import './frame.css'
import './ai-providers.css'
import { mount } from './mount'

/**
 * Scopes the vault's IndexedDB database. Stable forever: change it and every
 * key a visitor saved becomes unreadable, with no way to tell them why.
 */
const APP_ID = 'jugaaadi-showcase'

/**
 * Short, cheap, and verifiable at a glance. Deliberately not creative — the
 * question is "does this key still work", not "is this model any good".
 */
const TEST_PROMPT = 'Reply with the single word: OK'
const TEST_MAX_TOKENS = 16
const TEST_TIMEOUT_MS = 45_000

/** The dark shell's palette, handed to the package's themable modal. */
const MODAL_THEME = {
  primary: '#ff5a36',
  accent: '#ff5a36',
  accentRgb: '255 90 54',
  text: '#e6ebf4',
  muted: '#8b97ad',
  border: '#1f2633',
  surface: '#11151f',
  bg: '#0b0e14',
  danger: '#ff7a5c',
  overlay: 'rgb(4 6 10 / 0.74)',
  radius: 14,
  zIndex: 60,
  fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
}

type Filter = 'free' | 'credits' | 'paid' | 'browser' | 'all'

const FILTERS: { id: Filter; label: string; match: (p: AIProvider) => boolean }[] = [
  // Free first, and selected by default: "all the free providers" is the point
  // of the tab, and burying them in an alphabetical list of 35 hides it.
  { id: 'free', label: 'Free tier', match: (p) => p.freeTier === 'free' },
  { id: 'credits', label: 'Signup credits', match: (p) => p.freeTier === 'credits' },
  { id: 'paid', label: 'No free tier', match: (p) => !p.freeTier },
  { id: 'browser', label: 'Browser-ready', match: (p) => browserAccess(p.key).access === 'direct' },
  { id: 'all', label: 'All', match: () => true },
]

interface TestResult {
  state: 'running' | 'ok' | 'fail'
  /** Wall-clock round trip, including connection setup. */
  ms?: number
  outputTokens?: number
  totalTokens?: number
  /** Output tokens per second. Absent when the provider reports no usage. */
  tps?: number
  /** First line of what the model said, so a success is visibly a real answer. */
  reply?: string
  message?: string
}

// ── data helpers ─────────────────────────────────────────────────────────────

/** Free tiers first, then credits, then paid; alphabetical inside each group. */
const TIER_RANK = (p: AIProvider) => (p.freeTier === 'free' ? 0 : p.freeTier === 'credits' ? 1 : 2)

const SORTED = [...PROVIDERS].sort(
  (a, b) => TIER_RANK(a) - TIER_RANK(b) || a.name.localeCompare(b.name),
)

const COUNTS = {
  total: PROVIDERS.length,
  free: PROVIDERS.filter((p) => p.freeTier === 'free').length,
  credits: PROVIDERS.filter((p) => p.freeTier === 'credits').length,
  browserReady: PROVIDERS.filter((p) => browserAccess(p.key).access === 'direct').length,
}

/**
 * Turn whatever the SDK threw into something a user can act on.
 *
 * The important case is `TypeError: Failed to fetch`. That is what a CORS block
 * looks like from JavaScript: no status, no body, nothing to distinguish it from
 * a dropped connection. Left raw it reads as "this site is broken"; the registry
 * already knows better, so say so.
 */
function explain(error: unknown, provider: AIProvider): string {
  const raw = error instanceof Error ? error.message : String(error)
  const looksLikeNetwork = /failed to fetch|load failed|networkerror|fetch failed/i.test(raw)

  if (looksLikeNetwork) {
    const fact = browserAccess(provider.key)
    if (fact.access === 'proxy') {
      return `Blocked by the browser, as expected: ${provider.name} sends no CORS headers, so this key can only be used from a server. ${fact.note}`
    }
    return `Could not reach ${provider.name}. Usually CORS or a dropped connection — the browser reports no status. Original error: ${raw}`
  }
  if (/timeout|abort/i.test(raw)) {
    return `${provider.name} did not answer within ${TEST_TIMEOUT_MS / 1000}s.`
  }
  return raw
}

// ── the demo ─────────────────────────────────────────────────────────────────

function AIProvidersDemo() {
  const vaultSupported = useMemo(() => isVaultSupported(), [])
  // Constructing the vault throws on an insecure origin, so only do it when the
  // environment can actually support one.
  const vault: KeyVault | null = useMemo(
    () => (vaultSupported ? createKeyVault({ appId: APP_ID }) : null),
    [vaultSupported],
  )

  const [filter, setFilter] = useState<Filter>('free')
  const [query, setQuery] = useState('')
  const [connected, setConnected] = useState<string[]>([])
  /**
   * Stored as the *exclusions*, not the selection. Connecting a key should put
   * that provider in the next sweep without a second click, and a selection set
   * would either miss the new arrival or fight the user's unticks. Excluding is
   * the only thing they actually expressed an opinion about.
   */
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<Record<string, TestResult>>({})
  const [connectFor, setConnectFor] = useState<string | null>(null)
  const [sweeping, setSweeping] = useState(false)
  const [vaultError, setVaultError] = useState<string | null>(null)

  // A sweep can outlive the component in dev's StrictMode double-mount, so it
  // checks this before touching state.
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const refreshConnected = useCallback(async () => {
    if (!vault) return
    try {
      const keys = await vault.listConnected()
      if (!alive.current) return
      setConnected(keys)
      // Forget the exclusions of providers that are no longer connected, so a
      // key that is removed and re-added comes back ticked.
      setExcluded((prev) => new Set(keys.filter((k) => prev.has(k))))
    } catch (e) {
      if (alive.current) setVaultError(e instanceof Error ? e.message : String(e))
    }
  }, [vault])

  useEffect(() => {
    void refreshConnected()
  }, [refreshConnected])

  /**
   * Run the canned prompt once against one provider.
   *
   * The plaintext key exists only inside this function: read from the vault,
   * passed straight to the SDK, and out of scope when it returns. It is never
   * lifted into state, a ref, a log line, or a URL.
   */
  const runTest = useCallback(
    async (provider: AIProvider) => {
      if (!vault) return
      setResults((r) => ({ ...r, [provider.key]: { state: 'running' } }))

      const fail = (message: string) =>
        setResults((r) => ({ ...r, [provider.key]: { state: 'fail', message } }))

      try {
        const apiKey = await vault.getKey(provider.key)
        if (!apiKey) {
          fail('No key stored for this provider any more.')
          return
        }

        const override = await vault.getModelOverride(provider.key)
        const compat = provider.userConfigured ? await vault.getCompatConfig() : null
        const model = override?.trim() || compat?.model?.trim() || provider.defaultModel
        if (!model) {
          fail('This provider needs a model id. Add one when you connect the key.')
          return
        }
        if (provider.userConfigured && !compat?.baseURL) {
          fail('This provider needs a base URL. Add one when you connect the key.')
          return
        }

        const started = performance.now()
        const meta = await generateWithMeta({
          provider: provider.key,
          apiKey,
          model,
          baseURL: compat?.baseURL,
          prompt: TEST_PROMPT,
          temperature: 0,
          maxOutputTokens: TEST_MAX_TOKENS,
          abortSignal: AbortSignal.timeout(TEST_TIMEOUT_MS),
        })
        const ms = performance.now() - started

        // Not every provider reports usage; a missing count is left blank
        // rather than guessed at, because an invented tokens/sec is worse than
        // an empty cell.
        const outputTokens = meta.usage?.outputTokens
        if (!alive.current) return
        setResults((r) => ({
          ...r,
          [provider.key]: {
            state: 'ok',
            ms,
            outputTokens,
            totalTokens: meta.usage?.totalTokens,
            tps: outputTokens && ms > 0 ? (outputTokens / ms) * 1000 : undefined,
            reply: meta.text.trim().split('\n')[0]?.slice(0, 80),
          },
        }))
      } catch (e) {
        if (alive.current) fail(explain(e, provider))
      }
    },
    [vault],
  )

  /**
   * Test several providers one after another, not in parallel: the latency
   * number is the headline, and a dozen simultaneous TLS handshakes over one
   * connection pool would make every one of them a lie.
   */
  const sweep = useCallback(async () => {
    const queue = SORTED.filter((p) => connected.includes(p.key) && !excluded.has(p.key))
    if (!queue.length) return
    setSweeping(true)
    for (const provider of queue) {
      if (!alive.current) break
      await runTest(provider)
    }
    if (alive.current) setSweeping(false)
  }, [connected, excluded, runTest])

  const forget = useCallback(
    async (providerKey: string) => {
      if (!vault) return
      await vault.clearKey(providerKey)
      setResults((r) => {
        const { [providerKey]: _dropped, ...rest } = r
        return rest
      })
      await refreshConnected()
    },
    [vault, refreshConnected],
  )

  /**
   * Two clicks, not `window.confirm`. This demo runs inside the shell's iframe,
   * and a native dialog raised from a frame freezes the whole tab behind chrome
   * the user did not ask for. An inline "are you sure" is also honest about
   * what is about to happen, which a one-line dialog is not.
   */
  const forgetEverything = useCallback(async () => {
    if (!vault) return
    await vault.clearAll()
    setResults({})
    setExcluded(new Set())
    await refreshConnected()
  }, [vault, refreshConnected])

  const visible = useMemo(() => {
    const match = FILTERS.find((f) => f.id === filter)!.match
    const q = query.trim().toLowerCase()
    return SORTED.filter(
      (p) => match(p) && (!q || p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q)),
    )
  }, [filter, query])

  return (
    <div className="aip">
      <SecurityBanner onClearAll={forgetEverything} connectedCount={connected.length} />

      {!vaultSupported && (
        <p className="aip__warn">
          This browser has no WebCrypto or IndexedDB here, so the encrypted vault cannot open and
          keys cannot be stored. The registry below still works.
        </p>
      )}
      {vaultError && <p className="aip__warn">Vault error: {vaultError}</p>}

      <Bench
        connected={connected}
        excluded={excluded}
        results={results}
        sweeping={sweeping}
        onToggle={(key) =>
          setExcluded((prev) => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
          })
        }
        onRunAll={sweep}
        onTest={runTest}
        onForget={forget}
      />

      <section className="aip__section">
        <header className="aip__head">
          <h2 className="aip__h2">
            The registry <span className="aip__count">{COUNTS.total} providers</span>
          </h2>
          <p className="aip__sub">
            {COUNTS.free} with an ongoing free tier, {COUNTS.credits} with signup credits.{' '}
            {COUNTS.browserReady} can be called straight from this page — the rest need a server,
            and say so. CORS last measured {PROBED_ON}.
          </p>
        </header>

        <div className="aip__toolbar">
          <div className="aip__chips" role="group" aria-label="Filter providers">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className="aip__chip"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
                <span className="aip__chipCount">{PROVIDERS.filter(f.match).length}</span>
              </button>
            ))}
          </div>
          <input
            className="aip__search"
            type="search"
            value={query}
            placeholder="Search providers…"
            aria-label="Search providers"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="aip__grid">
          {visible.map((provider) => (
            <ProviderCard
              key={provider.key}
              provider={provider}
              connected={connected.includes(provider.key)}
              result={results[provider.key]}
              canStore={vaultSupported}
              onConnect={() => setConnectFor(provider.key)}
              onTest={() => runTest(provider)}
              onForget={() => forget(provider.key)}
            />
          ))}
          {!visible.length && <p className="aip__empty">No provider matches that filter.</p>}
        </div>
      </section>

      {connectFor && (
        <AIConnectModal
          appId={APP_ID}
          lockProvider={connectFor}
          theme={MODAL_THEME}
          title="Connect your key"
          subtitle="Encrypted with a non-extractable key and kept in this browser. It is sent to nobody but the provider."
          onClose={() => {
            setConnectFor(null)
            void refreshConnected()
          }}
        />
      )}
    </div>
  )
}

// ── pieces ───────────────────────────────────────────────────────────────────

/**
 * The claim that keys stay put is the load-bearing promise of a BYOK page on a
 * public domain, so it is stated at the top in plain words — not buried in a
 * tooltip — and sits next to the button that undoes it.
 */
function SecurityBanner({
  onClearAll,
  connectedCount,
}: {
  onClearAll: () => void
  connectedCount: number
}) {
  const [arming, setArming] = useState(false)

  // Drop back out of the armed state if every key goes away by another route.
  useEffect(() => {
    if (connectedCount === 0) setArming(false)
  }, [connectedCount])

  return (
    <section className="aip__banner">
      <div className="aip__bannerText">
        <h1 className="aip__h1">Your keys never leave this browser.</h1>
        <p>
          This page is static files. There is no server behind it to receive a key, and no
          analytics. Keys you paste are encrypted with a non-extractable WebCrypto key and stored in
          this browser&apos;s IndexedDB; the only request that ever carries one goes straight to that
          provider&apos;s own API. Nothing is logged, and no key is put in a URL.
        </p>
      </div>
      <div className="aip__bannerActions">
        <span className="aip__stored">
          {connectedCount === 0
            ? 'No keys stored'
            : `${connectedCount} provider${connectedCount === 1 ? '' : 's'} connected`}
        </span>
        {arming ? (
          <>
            <button type="button" className="aip__btn" onClick={() => setArming(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="aip__btn aip__btn--danger"
              onClick={() => {
                setArming(false)
                onClearAll()
              }}
            >
              Yes, erase {connectedCount}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="aip__btn aip__btn--danger"
            onClick={() => setArming(true)}
            disabled={connectedCount === 0}
          >
            Erase all stored keys
          </button>
        )}
      </div>
    </section>
  )
}

function Bench({
  connected,
  excluded,
  results,
  sweeping,
  onToggle,
  onRunAll,
  onTest,
  onForget,
}: {
  connected: string[]
  excluded: Set<string>
  results: Record<string, TestResult>
  sweeping: boolean
  onToggle: (key: string) => void
  onRunAll: () => void
  onTest: (p: AIProvider) => void
  onForget: (key: string) => void
}) {
  const rows = SORTED.filter((p) => connected.includes(p.key))
  const queued = rows.filter((p) => !excluded.has(p.key)).length

  return (
    <section className="aip__section">
      <header className="aip__head">
        <h2 className="aip__h2">
          Test bench <span className="aip__count">{rows.length} connected</span>
        </h2>
        <p className="aip__sub">
          One short prompt — <code>{TEST_PROMPT}</code> — per provider, run in sequence so the
          latency figures mean something. Tokens/sec is shown only where the provider reports usage.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="aip__empty">
          No keys yet. Pick a provider below and hit <strong>Connect a key</strong> — free tiers are
          listed first.
        </p>
      ) : (
        <>
          <div className="aip__benchBar">
            <button
              type="button"
              className="aip__btn aip__btn--primary"
              onClick={onRunAll}
              disabled={sweeping || queued === 0}
            >
              {sweeping ? 'Testing…' : `Test ${queued} selected`}
            </button>
          </div>
          <div className="aip__tableWrap">
            <table className="aip__table">
              <thead>
                <tr>
                  <th scope="col" className="aip__colPick">
                    <span className="aip__sr">Include in sweep</span>
                  </th>
                  <th scope="col">Provider</th>
                  <th scope="col">Result</th>
                  <th scope="col" className="aip__num">
                    Latency
                  </th>
                  <th scope="col" className="aip__num">
                    Out tokens
                  </th>
                  <th scope="col" className="aip__num">
                    Tok/s
                  </th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {rows.map((provider) => {
                  const result = results[provider.key]
                  return (
                    <tr key={provider.key}>
                      <td className="aip__colPick">
                        <input
                          type="checkbox"
                          checked={!excluded.has(provider.key)}
                          onChange={() => onToggle(provider.key)}
                          aria-label={`Include ${provider.name} in the sweep`}
                        />
                      </td>
                      <th scope="row" className="aip__rowName">
                        {provider.name}
                        <TierPill provider={provider} />
                      </th>
                      <td className="aip__resultCell">
                        <ResultCell result={result} />
                      </td>
                      <td className="aip__num">
                        {result?.ms != null ? `${Math.round(result.ms)} ms` : '—'}
                      </td>
                      <td className="aip__num">{result?.outputTokens ?? '—'}</td>
                      <td className="aip__num">
                        {result?.tps != null ? result.tps.toFixed(1) : '—'}
                      </td>
                      <td className="aip__rowActions">
                        <button
                          type="button"
                          className="aip__btn"
                          onClick={() => onTest(provider)}
                          disabled={result?.state === 'running' || sweeping}
                        >
                          Test
                        </button>
                        <button
                          type="button"
                          className="aip__btn aip__btn--quiet"
                          onClick={() => onForget(provider.key)}
                        >
                          Forget
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

function ResultCell({ result }: { result?: TestResult }) {
  if (!result) return <span className="aip__dim">not run</span>
  if (result.state === 'running') return <span className="aip__running">running…</span>
  if (result.state === 'ok') {
    return (
      <span className="aip__ok">
        works{result.reply ? <em> — “{result.reply}”</em> : null}
      </span>
    )
  }
  return <span className="aip__fail">{result.message}</span>
}

/**
 * The registry only knows 'free' | 'credits' | nothing. "Nothing" means "pay
 * per token" for a normal provider, but for the ones where you bring your own
 * endpoint or your own cloud account the price is not the package's to state —
 * so those say so instead of claiming "Paid".
 */
function TierPill({ provider }: { provider: AIProvider }) {
  const tier = provider.freeTier
  const label = tier
    ? tier === 'free'
      ? 'Free'
      : 'Credits'
    : provider.userConfigured || provider.auth === 'endpoint'
      ? 'Your account'
      : 'Paid'
  return <span className={`aip__pill aip__pill--${tier ?? 'paid'}`}>{label}</span>
}

const ACCESS_CLASS: Record<BrowserAccess, string> = {
  direct: 'aip__access--direct',
  proxy: 'aip__access--proxy',
  depends: 'aip__access--depends',
  unsupported: 'aip__access--unsupported',
}

function ProviderCard({
  provider,
  connected,
  result,
  canStore,
  onConnect,
  onTest,
  onForget,
}: {
  provider: AIProvider
  connected: boolean
  result?: TestResult
  canStore: boolean
  onConnect: () => void
  onTest: () => void
  onForget: () => void
}) {
  const fact = browserAccess(provider.key)
  // Endpoint-auth providers cannot be driven with a pasted key at all — the
  // package's own client rejects them — so the card offers no key entry.
  const connectable = provider.auth === 'apiKey' && canStore
  // A blocked provider still gets a Test button: it is the only way to see the
  // failure for yourself, and the card has already said what will happen.
  const testable = connected && provider.auth === 'apiKey'

  return (
    <article className={`aip__card${connected ? ' aip__card--connected' : ''}`}>
      <header className="aip__cardHead">
        <h3 className="aip__cardName">{provider.name}</h3>
        <TierPill provider={provider} />
      </header>

      <p className={`aip__access ${ACCESS_CLASS[fact.access]}`}>
        <span className="aip__accessLabel">{ACCESS_LABEL[fact.access]}</span>
        <span className="aip__accessNote">{fact.note}</span>
      </p>

      {provider.freeNote && <p className="aip__note">{provider.freeNote}</p>}

      <dl className="aip__meta">
        <dt>Model</dt>
        <dd>{provider.defaultModel || <span className="aip__dim">you choose</span>}</dd>
        <dt>Adapter</dt>
        <dd>{provider.sdk}</dd>
      </dl>

      {result && (
        <p className="aip__cardResult">
          <ResultCell result={result} />
        </p>
      )}

      <footer className="aip__cardFoot">
        {provider.url && (
          <a className="aip__link" href={provider.url} target="_blank" rel="noreferrer noopener">
            Get a key in {provider.where} ↗
          </a>
        )}
        <span className="aip__spacer" />
        {connectable && (
          <button type="button" className="aip__btn" onClick={onConnect}>
            {connected ? 'Keys' : 'Connect a key'}
          </button>
        )}
        {testable && (
          <button
            type="button"
            className="aip__btn aip__btn--primary"
            onClick={onTest}
            disabled={result?.state === 'running'}
          >
            Test
          </button>
        )}
        {connected && (
          <button type="button" className="aip__btn aip__btn--quiet" onClick={onForget}>
            Forget
          </button>
        )}
      </footer>
    </article>
  )
}

mount(<AIProvidersDemo />)
