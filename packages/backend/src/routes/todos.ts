import type { FastifyPluginCallbackTypebox } from "@fastify/type-provider-typebox";
import { CreateTodo, TodoListQuery, TodoParams, UpdateTodo, pageSize } from "@todo-app/shared";
import createError from "http-errors";

export const todosRoutes: FastifyPluginCallbackTypebox = (app, _opts, done) => {
  app.post(
    "/",
    { schema: { body: CreateTodo } },
    async (request, reply) => {
      const { id, text } = request.body;
      const todo = await app.db.create({ id, text });
      return reply.status(201).send(todo);
    },
  );

  app.get(
    "/",
    { schema: { querystring: TodoListQuery } },
    async (request, reply) => {
      const query = request.query;

      const limit = Math.min(query.limit ?? pageSize, pageSize);
      const order = query.order ?? "desc";

      const decodedCursor =
        query.cursor != null
          ? new Date(Buffer.from(query.cursor, "base64url").toString("utf-8"))
          : undefined;

      const rows = await app.db.findMany({
        status: query.status,
        order,
        cursor: decodedCursor,
        limit,
      });

      const lastRow = rows[rows.length - 1];
      const nextCursor =
        rows.length === limit && lastRow != null
          ? Buffer.from(lastRow.createdAt).toString("base64url")
          : null;

      return reply.send({ data: rows, cursor: nextCursor });
    },
  );

  app.patch(
    "/:id",
    { schema: { params: TodoParams, body: UpdateTodo } },
    async (request, reply) => {
      const { id } = request.params;
      const data = request.body;
      const result = await app.db.update(id, data);
      if (result === null) {
        throw createError(404, "Todo not found");
      }
      return reply.send(result);
    },
  );

  app.delete(
    "/:id",
    { schema: { params: TodoParams } },
    async (request, reply) => {
      const { id } = request.params;
      await app.db.delete(id);
      return reply.status(204).send();
    },
  );

  done();
};
