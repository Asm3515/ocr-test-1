import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function embedText1536(text: string): Promise<number[]> {
  const { data } = await client.embeddings.create({
    model: "text-embedding-3-small", // 1536-dim
    input: text
  });
  return data[0].embedding;
}
