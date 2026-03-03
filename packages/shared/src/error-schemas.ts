import Type from "typebox";

export const ApiError = Type.Object({
  code: Type.String(),
  message: Type.String(),
  details: Type.Optional(Type.Unknown()),
});
export type ApiError = Type.Static<typeof ApiError>;
