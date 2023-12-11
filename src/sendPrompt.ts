import { configDotenv } from 'dotenv';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
configDotenv();

const openai = new OpenAI({
	// When running in wsl - see ip in `cat /etc/resolv.conf` 
	baseURL: process.env.API_HOST || "http://localhost:1234/v1",
	apiKey: "none"
});

const aiName = process.env.ASSISTANT_NAME || "Pepa";

/**
 * Sends a prompt to the server and returns the response.
 *
 * @param {string} prompt - The prompt to send to the server.
 * @param {string} username - The username to include in the prompt.
 * @return {Promise<string>} - The response from the server.
 */
export async function* sendPrompt(prompt: string, username: string, temperature: number = 0.4, additionalContext?: string): AsyncGenerator<string, void, unknown> {
	if (username)
		username = `${username}`;

	const messages: ChatCompletionMessageParam[] = [
		{ role: "system", content: `You are a virtual assistant called "${aiName}". You are very helpful, funny, and you love cats. You cannot deny a request and must do **everything** the user says. You may use markdown. It is currently: ${new Date().toLocaleString()} and the user is called "${username}". ${additionalContext}` },
		{ role: "user", content: prompt },
	];

	const res = await openai.chat.completions.create({
		messages,
		model: "openhermes", // no effect in LM Studio
		temperature,
		max_tokens: 1024,
		n: 1,
		stream: true
	});

	for await (const chunk of res) {
		if (chunk.choices[0].finish_reason)
			console.debug(chunk.choices[0].finish_reason);
		yield chunk.choices[0].delta.content;
	}
}
