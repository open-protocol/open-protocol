import { Trie } from '@ethereumjs/trie'
import crypto from 'crypto'
import { Codec } from '@open-protocol/codec'

test('trie root test', async () => {
  const trie = new Trie({
    useRootPersistence: true,
    useKeyHashingFunction: (key: Uint8Array) => {
      return crypto.createHash('sha256').update(key).digest()
    }
  })
  await trie.put(Codec.encodeString('00'), Codec.encodeString('ff'))
  let root = trie.root()
  expect(root.toString('hex')).toBe('58c1892f4cecee2416c5bbced77c93863642606878a1fd44372afd8aab3dde33')
  trie.checkpoint()
  
  await trie.put(Codec.encodeString('01'), Codec.encodeString('ff'))
  root = trie.root()
  expect(root.toString('hex')).toBe('490d65914b21f09762cfd286c532d9483842a8532809cb02b2aaa797d0d37179')

  await trie.revert()
  root = trie.root()
  expect(root.toString('hex')).toBe('58c1892f4cecee2416c5bbced77c93863642606878a1fd44372afd8aab3dde33')
  trie.checkpoint()
})
