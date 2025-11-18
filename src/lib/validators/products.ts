import { z } from "zod";

export const productSchema = z.object({
  nome: z.string().min(2, "Informe o nome do produto"),
  categoria: z.string().min(2, "Informe a categoria"),
  preco: z
    .number()
    .optional()
    .refine((value) => value == null || value >= 0, "Preço inválido"),
  imagemUrl: z.string().url("Informe uma URL válida").optional(),
  cores: z.array(z.string()).optional(),
  tamanhos: z.array(z.string()).optional(),
  estoque: z.number().int().min(0).optional(),
  observacoes: z.string().optional(),
});

export type ProductPayload = z.infer<typeof productSchema>;

export const productUpdateSchema = productSchema
  .partial()
  .extend({
    preco: z
      .number()
      .optional()
      .refine((value) => value == null || value >= 0, "Preço inválido"),
    imagemUrl: z.string().url().nullable().optional(),
    estoque: z.number().int().min(0).nullable().optional(),
    observacoes: z.string().nullable().optional(),
  })
  .refine(
    (data) =>
      Object.keys(data).length > 0 &&
      Object.values(data).some((value) => value !== undefined),
    {
      message: "Informe ao menos um campo para atualizar.",
      path: ["root"],
    }
  );



