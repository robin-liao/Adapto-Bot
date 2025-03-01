import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

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
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: text,
      temperature,
      max_tokens,
      top_p: 1,
      frequency_penalty,
      presence_penalty,
    });

    return response.data.choices[0].text;
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
