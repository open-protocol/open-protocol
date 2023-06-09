import { TaskManager } from "./manager.js";

export interface ITask {
  name: () => string;

  init: (manager: TaskManager) => Promise<void>;

  start: () => Promise<void>;

  stop: () => Promise<void>;
}
