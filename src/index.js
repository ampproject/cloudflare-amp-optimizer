const AmpOptimizer = require('@ampproject/toolbox-optimizer')
const { DocTagger, LinkRewriter } = require('./rewriters')
const config = /** @type {ConfigDef} */ (require('../config.json'))
config.MODE = process.env.NODE_ENV === 'test' ? 'test' : MODE

/**
 * Configuration typedef.
 * @typedef {{
 *  from: string,
 *  to: string,
 *  domain: string,
 *  optimizer: Object,
 *  enableCloudflareImageOptimization: boolean,
 *  MODE: string,
 *  kvCaching: boolean,
 * }} ConfigDef
 */

const ampOptimizer = getOptimizer(config)
validateConfiguration(config)
addEventListener('fetch', event => {
  event.passThroughOnException()
  return event.respondWith(handleRequest(event.request, config, event))
})

/**
 * @param {!Request} request
 * @param {!ConfigDef} config
 * @param {FetchEvent} event
 * @return {!Request}
 */
async function handleRequest(request, config = config, event) {
  const url = new URL(request.url)
  if (isReverseProxy(config)) {
    url.hostname = config.to
  }

  // Immediately return if not GET.
  if (request.method !== 'GET') {
    request.url = url
    return fetch(request)
  }

  if (config.kvCaching) {
    const cached = await KV.get(request.url)
    if (cached) {
      // TODO: can we do something faster than JSON.parse?
      const { status, statusText, headers, text } = JSON.parse(cached)
      return new Response(text, { status, statusText, headers })
    }
  }

  const response = await fetch(url.toString(), { minify: { html: true } })
  const clonedResponse = response.clone()
  const { headers, status, statusText } = response

  // Note: it turns out that content-type lies ~25% of the time.
  // See: https://blog.cloudflare.com/html-parsing-1/
  if (!headers.get('content-type').includes('text/html')) {
    return clonedResponse
  }

  const responseText = await response.text()
  if (!isAmp(responseText)) {
    return clonedResponse
  }

  try {
    const transformed = await ampOptimizer.transformHtml(responseText)
    const response = new Response(transformed, { headers, statusText, status })
    const rewritten = addTag(maybeRewriteLinks(response, config))

    if (config.kvCaching) {
      event.waitUntil(storeResponse(request.url, rewritten.clone()))
    }
    return rewritten
  } catch (err) {
    if (config.MODE !== 'test') {
      console.error(`Failed to optimize: ${url.toString()}, with Error; ${err}`)
    }
    return clonedResponse
  }
}

/**
 * @param {string} key
 * @param {!Response} response
 * @returns {!Promise}
 */
async function storeResponse(key, response) {
  // Wait a macrotask so that all of this logic occurs after
  // we've already started streaming the response.
  await new Promise(r => setTimeout(r, 0))

  const { headers, status, statusText } = response
  const text = await response.text()
  console.log(`Putting: ${key}, with text: ${status}`)

  return KV.put(
    key,
    JSON.stringify({
      text,
      headers: Array.from(headers.entries()),
      statusText,
      status,
    }),
    {
      expirationTtl: 60 * 60, //TODO: Match the cache time with the Response.
    },
  )
}

/**
 * @param {!Response} response
 * @param {!ConfigDef} config
 * @returns {!Response}
 */
function maybeRewriteLinks(response, config) {
  if (!isReverseProxy(config)) {
    return response
  }
  const linkRewriter = new HTMLRewriter().on('a', new LinkRewriter(config))
  return linkRewriter.transform(response)
}

/**
 * Adds `data-cfw` to the html node to mark it as optimized by this package.
 * @param {!Response} response
 * @returns {!Response}
 */
function addTag(response) {
  const rewriter = new HTMLRewriter().on('html', new DocTagger())
  return rewriter.transform(response)
}

/**
 * @param {string} html
 * @returns {boolean}
 */
function isAmp(html) {
  return /<html\s[^>]*(⚡|amp)[^>]*>/.test(html)
}

/**
 * @param {!ConfigDef} config
 * @returns {boolean}
 */
function isReverseProxy(config) {
  return !config.domain
}

/** @param {!ConfigDef} config */
function validateConfiguration(config) {
  const allowed = new Set([
    'from',
    'to',
    'domain',
    'optimizer',
    'enableCloudflareImageResizing',
    'MODE',
    'kvCaching',
  ])
  Object.keys(config).forEach(key => {
    if (!allowed.has(key)) {
      throw new Error(`Unknown key "${key}" found in configuration.`)
    }
  })

  if (isReverseProxy(config)) {
    if (!config.from || !config.to) {
      throw new Error(
        `If using amp-cloudflare-worker as a reverse proxy, you must provide both a "from" and "to" address in the config.json.`,
      )
    }
  } else {
    if (config.from || config.to) {
      throw new Error(
        `If using amp-cloudflare-worker as an interceptor, "from" and "to" should be removed from config.json.`,
      )
    }
  }
}

/**
 * Returns an AmpOptimizer for the given configuraion.
 *
 * 1. cache set to false, s.t. it doesn't try to write to fs.
 * 2. minify:false is necessary to speed up the AmpOptimizer. terser also cannot be used since dynamic eval() is part of terser and banned by CloudflareWorkers.
 *    see the webpack.config.js for how we disable the terser module.
 * 3. fetch is set to Cloudflare Worker provided fetch, with high caching to amortize startup time for each AmpOptimizer instance.
 * @param {!ConfigDef} config
 * @returns {!AmpOptimizer}
 */
function getOptimizer(config) {
  const imageOptimizer = (src, width) =>
    `/cdn-cgi/image/width=${width},f=auto/${src}`
  return AmpOptimizer.create({
    ...(config.optimizer || {}),
    minify: false,
    cache: false,
    fetch: (url, init) =>
      fetch(url, {
        ...init,
        cf: {
          minify: { html: true },
        },
      }),
    transformations: AmpOptimizer.TRANSFORMATIONS_MINIMAL,
    imageOptimizer: !!config.enableCloudflareImageOptimization
      ? imageOptimizer
      : undefined,
  })
}

module.exports = {
  getOptimizer,
  handleRequest,
  validateConfiguration,
}
