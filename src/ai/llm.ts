const endpoint = process.env["AZUE_AI_ENDPOINT"];
const azureApiKey = process.env["AZURE_API_KEY"];
const axios = require("axios");

export const callLLM = async (content) => {
    const body = {
        messages: content,
        temperature: 0.7,
        top_p: .95
    };
    const headers = {
        "api-key": azureApiKey,
        "Content-Type": "application/json",
        "Content-Length": JSON.stringify(body).length,
    };
    const result = await axios.post(endpoint, body, {
        headers
    })
    const json = result.data.choices[0].message.content;
    console.log(`Result: \n\n ${JSON.stringify(json)}`)
    return json;
}