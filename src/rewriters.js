/**
 * LinkRewriter for making all anchor tags point to the reverse-proxy
 * instead of the underlying domain.
 */

class LinkRewriter {
  /**
   * @param {!../index.js.ConfigDef} config
   */
  constructor(config) {
    /** @type {../index.js.ConfigDef} */
    this.config = config
  }

  element(element) {
    const { to, from } = this.config
    const href = element.getAttribute('href')
    if (this.config.MODE === 'dev') {
      element.setAttribute(
        'href',
        href.replace(to, 'localhost:8787').replace('https://', 'http://'),
      )
      return
    }
    element.setAttribute('href', href.replace(from, to))
  }
}

class DocTagger {
  element(el) {
    el.setAttribute('data-cfw', '')
  }
}

module.exports = { LinkRewriter, DocTagger }
