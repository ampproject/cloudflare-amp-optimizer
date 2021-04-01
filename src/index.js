const AmpOptimizer = require('@ampproject/toolbox-optimizer')
const LinkRewriter = require('./link-rewriter')
const config = require('../config.json')

/**
 * Configuration typedef.
 * @typedef {{from: string, to: string, domain: string} ConfigDef
 */

validateConfiguration(config)

/**
 * 1. cache set to false, s.t. it doesn't try to write to fs.
 * 2. minify:false is necessary to speed up the AmpOptimizer. terser also cannot be used since dynamic eval() is part of terser and banned by CloudflareWorkers.
 *    see the webpack.config.js for how we disable the terser module.
 * 3. fetch is set to Cloudflare Worker provided fetch, with high caching to amortize startup time for each AmpOptimizer instance.
 */
const ampOptimizer = AmpOptimizer.create({
  minify: false,
  cache: false,
  fetch: (url, init) =>
    fetch(url, {
      ...init,
      cf: {
        cacheEverything: true,
        cacheTtl: 60 * 60 * 6, // 6 hours
      },
    }),
  transformations: AmpOptimizer.TRANSFORMATIONS_MINIMAL,
})

async function handleRequest(request) {
  const url = new URL(request.url)
  if (isReverseProxy(config)) {
    url.hostname = config.to
  }

  // TODO: add cf fetch cache based on cache-control headers of the response.
  const response = await fetch(url.toString())
  const clonedResponse = response.clone()
  const { headers, status, statusText } = response

  // Turns out that content-type lies ~25% of the time.
  // Therefore we use starting with `<` as a heuristic as well.
  // See: https://blog.cloudflare.com/html-parsing-1/
  if (!headers.get('content-type').includes('text/html')) {
    return clonedResponse
  }

  const responseText = await response.text()
  const isAmpHtml = responseText.startsWith('<') && isAmp(responseText)
  if (!isAmpHtml) {
    return clonedResponse
  }

  try {
    // TODO: use cache for storing transformed result.
    const transformed = await ampOptimizer.transformHtml(responseText)
    const r = new Response(transformed, { headers, statusText, status })
    return maybeRewriteLinks(r, config)
  } catch (err) {
    console.error(`Failed to optimize: ${url.toString()}, with Error; ${err}`)
    return clonedResponse
  }
}

addEventListener('fetch', event => {
  event.passThroughOnException()
  return event.respondWith(handleRequest(event.request))
})

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
 * @param {string} html
 * @returns {boolean}
 */
function isAmp(html) {
  return /<html\s[^>]*(⚡|amp)[^>]*>/.test(html)
}

/**
 * @param {ConfigDef} config
 * @returns {boolean}
 */
function isReverseProxy(config) {
  return !config.domain
}

/** @param {!ConfigDef} config */
function validateConfiguration(config) {
  if (isReverseProxy) {
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
