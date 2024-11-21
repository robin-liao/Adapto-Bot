import { ITeamsScenario, IScenarioBuilder } from "../teams-bot";
import { callLLM } from "../llm";

export class ActivityGenerator implements ITeamsScenario {
    public accept(teamsBot: IScenarioBuilder) {
        teamsBot.registerTextCommand(/^generate/i, async (context) => {
            const systemPrompt = "You are AI assistant to help with generating bot framework activity json. You need to generate Microsoft Teams bot framework activity payload for a given request. Produce the output in raw json.\n[EXAMPLE OUTPUT]\n{\n  \"type\": \"message\",\n  \"text\": \"Hello world\"\n}";
            const prompt = [
                {
                    "role": "system",
                    "content": systemPrompt
                },
                {
                    "role": "user",
                    "content": context.activity.text
                }
            ]
            const aiResult = await callLLM(prompt);
            await context.sendActivity(`AI result\n${aiResult}`);
            try {
                const activity = JSON.parse(aiResult);
                await context.sendActivity(activity);
            }
            catch (error) {
                await context.sendActivity(`Activity error: ${JSON.stringify(error)}`);
            }

        });

    }
}
