import { OpenAI as OAI } from "openai";
import { JSONSchema } from "openai/lib/jsonschema";

const openai = new OAI({ apiKey: process.env.OPENAI_API_KEY });

export class OpenAI {
  public static async gpt(
    text: string,
    temperature = 0.9,
    max_tokens = 1000,
    frequency_penalty = 0.0,
    presence_penalty = 0.6
  ) {
    console.log(
      `text=${text}\ntemperature=${temperature}\nmax_tokens=${max_tokens}\nfrequency_penalty=${frequency_penalty}\npresence_penalty=${presence_penalty}`
    );
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: [{ type: "text", text }] }],
    });

    return response.choices[0].message.content;
  }

  public static async getRealtimeSession() {
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "verse",
      }),
    });
    const data = await r.json();
    return data;
  }
}

export interface Tool {
  type: "function";
  name: string;
  description: string;
  parameters: JSONSchema;
}
