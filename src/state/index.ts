import { Trie } from '@ethereumjs/trie'
import { Level } from 'level'
import { ITask, TaskManager } from '../task'
import { LevelDB } from './level.js'
import crypto from 'crypto'

export class StateTask implements ITask {
  manager: TaskManager
  trie: Trie

  name = () => 'state'

  init = async (manager: TaskManager): Promise<void> => {
    this.manager = manager
    this.trie = await Trie.create({
      db: new LevelDB(new Level('./db')),
      useRootPersistence: true,
      useKeyHashing: true,
      useKeyHashingFunction: (key: Uint8Array) => {
        return crypto.createHash('sha256').update(key).digest()
      }
    })
  }

  start = async (): Promise<void> => { }

  stop = async (): Promise<void> => { }

  put = async (key: Buffer, value: Buffer): Promise<void> => {
    await this.trie.put(key, value)
  }

  get = async (key: Buffer): Promise<Buffer | null> => {
    return await this.trie.get(key)
  }

  del = async (key: Buffer): Promise<void> => {
    await this.trie.del(key)
  }

  apply = async (db: Map<Buffer, Buffer>) => {
    this.trie.checkpoint()
    for (const [key, value] of db) {
      await this.trie.put(key, value)
    }
  }

  commit = async () => {
    await this.trie.commit()
  }

  root = () => {
    return this.trie.root()
  }
}