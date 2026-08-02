/**
 * Which providers a *browser* can actually call.
 *
 * `@jugaaadi/ai-providers` is BYOK and runs client-side, so every request goes
 * straight from the user's browser to the provider. That makes CORS the real
 * constraint, and it is invisible in the registry: a provider can have a lovely
 * free tier, a valid key and a correct model id, and still be unusable here
 * because its API returns no `Access-Control-Allow-Origin` header. The browser
 * then throws a bare `TypeError: Failed to fetch` with no status and no body —
 * indistinguishable, from JavaScript, from the user's wifi dropping.
 *
 * A test button that always fails with a mystery network error is worse than no
 * button, so this table exists to say so up front.
 *
 * ── How these values were obtained ──────────────────────────────────────────
 * Not from documentation — measured. On 2026-08-02, from a page on
 * http://localhost:5180, a POST carrying a deliberately invalid key was sent to
 * each provider's real chat endpoint and the outcome recorded:
 *
 *   'direct' — the response was readable from JS (a 400/401/403 saying the key
 *              is bad IS a success for this purpose: it proves the round trip
 *              completed and CORS allowed it).
 *   'proxy'  — `fetch` rejected while the same host answered fine in `no-cors`
 *              mode, i.e. the host is up and it is the CORS policy blocking us.
 *
 * Every result was then re-checked with curl from `Origin:
 * https://public.jugaaadi.com` (the deployed origin) as well as from localhost,
 * inspecting `access-control-allow-origin` on the *actual* response, not just
 * the preflight. That distinction matters: OpenAI, Cerebras, Scaleway and the
 * Vercel AI Gateway all answer the OPTIONS preflight happily and then omit the
 * header on the POST, so the browser discards a response the server did send.
 * Both origins gave identical verdicts, so nothing here is a localhost artefact.
 *
 * ── Caveats, stated plainly ─────────────────────────────────────────────────
 * A CORS policy is a deployment detail, not an API contract. Providers change
 * these without notice, in both directions. Treat this as "measured on the date
 * above", re-run the probe before trusting it, and note that the UI always
 * offers the real error when a call fails rather than relying only on this map.
 */

export type BrowserAccess =
    /** Verified: the browser can call this provider directly. */
    | 'direct'
    /** Verified: CORS blocks it. Needs a server-side proxy — impossible here. */
    | 'proxy'
    /** The user supplies the endpoint, so only they can know. */
    | 'depends'
    /** Not a single-key provider at all; the package cannot call it either way. */
    | 'unsupported'

export interface AccessFact {
    access: BrowserAccess
    /** One clause, shown on the card. No jargon the user cannot act on. */
    note: string
}

/**
 * Keyed by `AIProvider.key`. Anything missing is treated as 'depends' by
 * `browserAccess()` below — a new provider in the registry should show up as
 * "untested", never as a confident claim nobody measured.
 */
const FACTS: Record<string, AccessFact> = {
    // ── free tier, callable from a browser ──
    gemini: { access: 'direct', note: 'Reflects the page origin; works from a browser.' },
    groq: { access: 'direct', note: 'Sends Access-Control-Allow-Origin: *.' },
    mistral: { access: 'direct', note: 'Sends Access-Control-Allow-Origin: *.' },
    cohere: { access: 'direct', note: 'Sends Access-Control-Allow-Origin: *.' },
    openrouter: { access: 'direct', note: 'Sends Access-Control-Allow-Origin: *.' },
    huggingface: { access: 'direct', note: 'Sends Access-Control-Allow-Origin: *.' },
    siliconflow: { access: 'direct', note: 'Sends Access-Control-Allow-Origin: *.' },
    zai: { access: 'direct', note: 'Reflects the page origin; works from a browser.' },
    modelscope: { access: 'direct', note: 'Sends Access-Control-Allow-Origin: *.' },

    // ── free tier, but unreachable from a browser ──
    cerebras: {
        access: 'proxy',
        note: 'Answers the CORS preflight, then omits the header on the real response — the browser throws the reply away.',
    },
    nvidia: { access: 'proxy', note: 'No CORS headers at all. Server-side only.' },
    githubModels: { access: 'proxy', note: 'Preflight is refused outright (410). Server-side only.' },
    cloudflare: {
        access: 'proxy',
        note: 'The REST API rejects the preflight. Probed with a placeholder account id, so a real account may differ — but no CORS support was advertised.',
    },

    // ── paid / credits, callable from a browser ──
    claude: {
        access: 'direct',
        note: 'Needs the anthropic-dangerous-direct-browser-access opt-in, which the package already sends.',
    },
    xai: { access: 'direct', note: 'Sends Access-Control-Allow-Origin: *.' },
    deepseek: { access: 'direct', note: 'Reflects the page origin; works from a browser.' },
    perplexity: { access: 'direct', note: 'Sends Access-Control-Allow-Origin: *.' },
    together: { access: 'direct', note: 'Sends Access-Control-Allow-Origin: *.' },
    fireworks: { access: 'direct', note: 'Sends Access-Control-Allow-Origin: *.' },
    deepinfra: { access: 'direct', note: 'Sends Access-Control-Allow-Origin: *.' },
    novita: { access: 'direct', note: 'Sends Access-Control-Allow-Origin: *.' },
    baseten: { access: 'direct', note: 'Sends Access-Control-Allow-Origin: *.' },
    hyperbolic: { access: 'direct', note: 'Sends Access-Control-Allow-Origin: *.' },
    nebius: { access: 'direct', note: 'Sends Access-Control-Allow-Origin: *.' },
    alibaba: { access: 'direct', note: 'Sends Access-Control-Allow-Origin: *.' },
    inferencenet: { access: 'direct', note: 'Sends Access-Control-Allow-Origin: *.' },
    nscale: { access: 'direct', note: 'Sends Access-Control-Allow-Origin: *.' },

    // ── paid / credits, unreachable from a browser ──
    gpt: {
        access: 'proxy',
        note: 'OpenAI allows the preflight but strips the header from the response. Deliberate: keys are not meant to reach a browser.',
    },
    vercelGateway: {
        access: 'proxy',
        note: 'Answers the preflight, then omits the header on the real response.',
    },
    sambanova: { access: 'proxy', note: 'No CORS headers at all. Server-side only.' },
    scaleway: {
        access: 'proxy',
        note: 'Answers the preflight, then omits the header on the real response.',
    },

    // ── you tell us ──
    openaiCompat: { access: 'depends', note: 'Your endpoint, your CORS policy — only you can know.' },

    // ── the package cannot call these with a single key regardless ──
    azure: { access: 'unsupported', note: 'Needs a resource name and deployment, not a bearer token.' },
    bedrock: { access: 'unsupported', note: 'Needs SigV4 request signing with AWS credentials.' },
    vertex: { access: 'unsupported', note: 'Needs a Google service-account JSON.' },
}

export function browserAccess(providerKey: string): AccessFact {
    return (
        FACTS[providerKey] ?? {
            access: 'depends',
            note: 'Not probed yet — added to the registry after the last CORS sweep.',
        }
    )
}

export const ACCESS_LABEL: Record<BrowserAccess, string> = {
    direct: 'Browser-ready',
    proxy: 'Needs a server proxy',
    depends: 'Depends on your endpoint',
    unsupported: 'Not supported',
}

/** The date the table above was measured. Shown in the UI so it can age visibly. */
export const PROBED_ON = '2 Aug 2026'
