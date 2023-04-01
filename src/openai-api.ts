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
}
