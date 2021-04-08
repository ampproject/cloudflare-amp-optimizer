/**
 * LinkRewriter for making all anchor tags point to the reverse-proxy
 * instead of the underlying domain.
 */

class LinkRewriter {
  constructor(config) {
    /** @type {{from?: string, to: string}} */
    this.config = {
      from: config.from,
      to: config.to,
    }
  }

  element(element) {
    const { to, from } = this.config
    const href = element.getAttribute('href')
    if (MODE === 'dev') {
      element.setAttribute(
        'href',
        href.replace(to, 'localhost:8787').replace('https://', 'http://'),
      )
      return
    }
    element.setAttribute('href', href.replace(to, from))
  }
}

module.exports = LinkRewriter
