import { Level } from 'level'
import { MemoryLevel } from 'memory-level'

export class LevelDB {
  leveldb_:  Level<Buffer, Buffer> | MemoryLevel<Buffer, Buffer>

  constructor(leveldb: Level<Buffer, Buffer> | MemoryLevel<Buffer, Buffer>) {
    this.leveldb_ = leveldb ?? new MemoryLevel()
  }

  get = async (key: Buffer): Promise<Buffer> => {
    let value = null
    try {
      value = await this.leveldb_.get(key)
    } catch (e: any) {
      if (e.notFound !== true) {
        throw e
      }
    }
    return value
  }

  put = async (key: Buffer, val: Buffer): Promise<void> => {
    await this.leveldb_.put(key, val)
  }

  del = async (key: Buffer): Promise<void> => {
    await this.leveldb_.del(key)
  }

  batch = async (opStack) => {
    await this.leveldb_.batch(opStack)
  }

  copy = () => {
    return new LevelDB(this.leveldb_)
  }
}
