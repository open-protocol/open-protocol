import { logger } from '../logger'
import { ITask } from './task.js'

export class TaskManager {
  tasks: Map<string, ITask>

  constructor() {
    this.tasks = new Map<string, ITask>()
  }

  add = (task: ITask) => {
    this.tasks.set(task.name(), task)
  }

  initialize = async () => {
    await Promise.all([...this.tasks].map(([_, task]) => task.init(this)))
  }

  start = async () => {
    await Promise.all([...this.tasks].map(([_, task]) => {
      task.start()
      logger.info(`${task.name()} has started.`)
    }))
  }

  stop = async () => {
    await Promise.all([...this.tasks].map(([_, task]) => {
      task.stop()
      logger.info(`${task.name()} has stopped.`)
    }))
    process.exit(0)
  }

  get = <T extends ITask>(name: string): T => {
    return this.tasks.get(name) as T
  }
}