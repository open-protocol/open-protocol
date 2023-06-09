import Fastify, { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  JSONRPCServer,
  JSONRPCRequest,
  SimpleJSONRPCMethod,
  JSONRPCResponse,
} from "json-rpc-2.0";
import { logger } from "../logger/index.js";
import { ITask, TaskManager } from "../task/index.js";

export class RpcTask implements ITask {
  fastify: FastifyInstance;
  server: JSONRPCServer;
  manager: TaskManager;

  name = () => "rpc";

  init = async (manager: TaskManager): Promise<void> => {
    this.manager = manager;

    this.fastify = Fastify().withTypeProvider<TypeBoxTypeProvider>();
    this.server = new JSONRPCServer();

    this.fastify.get("/health", async () => {
      return "Node is alive.";
    });

    this.fastify.post<{ Body: JSONRPCRequest; Reply: JSONRPCResponse }>(
      "/jsonrpc",
      async (request, reply) => {
        const jsonrpcReq = request.body;
        const jsonrpcRes = await this.server.receive(jsonrpcReq);

        if (jsonrpcRes) {
          reply.send(jsonrpcRes);
        } else {
          reply.status(204);
          reply.send();
        }
      }
    );
  };

  start = async (): Promise<void> => {
    const port = process.env.RPC_PORT ? parseInt(process.env.RPC_PORT) : 9999;
    await this.fastify.listen({ port });
    logger.info(`Server listen on ${port}...`);
  };

  stop = async (): Promise<void> => {
    await this.fastify.close();
  };

  addMethod = (name: string, method: SimpleJSONRPCMethod) => {
    this.server.addMethod(name, method);
  };
}
