const AmpOptimizer = require('@ampproject/toolbox-optimizer')
const config = require('../config.json')
const LinkRewriter = require('./link-rewriter')
const linkRewriter = new HTMLRewriter().on('a', new LinkRewriter(config))
const isReverseProxy = !config.domain

// Ensure config is valid
if (config.from || config.to) {
  if (!config.from || !config.to) {
    throw new Error(
      `If using Cloudflare Worker as your primary domain, you must provide both a "from" and "to" address in optimizer-config.js`,
    )
  }
}
if (config.domain) {
  if (config.from || config.to) {
    throw new Error(
      `If using Cloudflare Worker as a route interceptor, "from" and "to" are unnecessary. Please delete them from optimizer-config.js`,
    )
  }
}

/**
 * 1. minify:false is necessary to speed up the AmpOptimizer. terser also cannot be used since dynamic eval() is part of terser and banned by CloudflareWorkers.
 *    see the webpack.config.js for how we disable the terser module.
 * 2. cache set to false, s.t. it doesn't try to write to fs.
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
})

async function handleRequest(request) {
  const url = new URL(request.url)
  if (config.to && (!config.from || url.hostname === config.from)) {
    url.hostname = config.to
  }

  // TODO: add cf fetch cache based on cache-control headers of the response.
  const response = await fetch(url.toString())
  const clonedResponse = response.clone()
  const { headers, status, statusText } = response

  // Turns out that content-type lies ~25% of the time.
  // Therefore we use starting with `<` as a heuristic as well.
  // See: https://blog.cloudflare.com/html-parsing-1/
  const responseText =
    headers.get('content-type').includes('text/html') && (await response.text())
  const isHtml = responseText && responseText.startsWith('<')

  // If not HTML then return original response unchanged.
  if (!isHtml) {
    return clonedResponse
  }

  try {
    // TODO: use cache for storing transformed result.
    const transformed = await ampOptimizer.transformHtml(responseText)
    const r = new Response(transformed, { headers, statusText, status })
    if (isReverseProxy) {
      return linkRewriter.transform(r)
    }
    return r
  } catch (err) {
    console.error(`Failed to optimize: ${url.toString()}, with Error; ${err}`)
    return clonedResponse
  }
}

addEventListener('fetch', event => {
  event.passThroughOnException()
  return event.respondWith(handleRequest(event.request))
})
