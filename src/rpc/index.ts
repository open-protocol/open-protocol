import Fastify, { FastifyInstance } from 'fastify'
import { JSONRPCServer, JSONRPCRequest, SimpleJSONRPCMethod } from 'json-rpc-2.0'
import { logger } from '../logger'
import { ITask, TaskManager } from '../task'

export class RpcTask implements ITask {
  fastify: FastifyInstance
  server: JSONRPCServer
  manager: TaskManager

  name = () => 'rpc'

  init = async (manager: TaskManager): Promise<void> => {
    this.manager = manager

    this.fastify = Fastify()
    this.server = new JSONRPCServer()

    this.fastify.get('/health', async () => {
      return 'Node is alive.'
    })

    this.fastify.post('/jsonrpc', async (request, reply) => {
      const jsonrpcRequest = request.body as JSONRPCRequest
      const jsonrpcResponse = await this.server.receive(jsonrpcRequest)

      if (jsonrpcResponse) {
        reply.send(jsonrpcResponse)
      } else {
        reply.status(204)
        reply.send()
      }
    })
  }

  start = async (): Promise<void> => {
    const port = process.env.RPC_PORT ? parseInt(process.env.RPC_PORT) : 9999
    await this.fastify.listen({ port })
    logger.info(`Server listen on ${port}...`)
  }

  stop = async (): Promise<void> => {
    await this.fastify.close()
  }

  addMethod = (name: string, method: SimpleJSONRPCMethod) => {
    this.server.addMethod(name, method)
  }
}
