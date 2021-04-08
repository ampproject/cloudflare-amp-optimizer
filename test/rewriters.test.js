const { beforeEach, expect, it, describe } = require('@jest/globals')
const { DocTagger, LinkRewriter } = require('../src/rewriters')

describe('Rewriters', () => {
  describe('LinkRewriter', () => {
    let a
    beforeEach(() => {
      a = {
        getAttribute: jest.fn(attr => {
          if (attr === 'href') {
            return 'https://test-origin.com/subpage'
          }
          return null
        }),
        setAttribute: jest.fn(),
      }
    })

    it('Should rewrite to localhost in MODE=dev', () => {
      const config = {
        from: 'test-worker.com',
        to: 'test-origin.com',
        MODE: 'dev',
      }
      new LinkRewriter(config).element(a)
      expect(a.setAttribute).toBeCalledWith(
        'href',
        'http://localhost:8787/subpage',
      )
    })

    it('Should rewrite to origin', () => {
      const config = { from: 'test-worker.com', to: 'test-origin.com' }
      new LinkRewriter(config).element(a)
      expect(a.setAttribute).toBeCalledWith(
        'href',
        'https://test-origin.com/subpage',
      )
    })
  })

  describe('DocTagger', () => {
    it('Should add data-cfw as an attribute to nodes', () => {
      const element = { setAttribute: jest.fn() }
      new DocTagger().element(element)
      expect(element.setAttribute).toBeCalledWith('data-cfw', '')
    })
  })
})
