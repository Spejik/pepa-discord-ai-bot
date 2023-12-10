import OpenAI from 'openai';

const openai = new OpenAI({
	// baseURL: `http://localhost:1234/v1`,
	baseURL: `http://172.24.176.1:1234/v1`,
	apiKey: "none"
});

/**
 * Sends a prompt to the server and returns the response.
 *
 * @param {string} prompt - The prompt to send to the server.
 * @param {string} username - The username to include in the prompt.
 * @return {Promise<string>} - The response from the server.
 */
export async function* sendPrompt(prompt: string, username: string, temperature: number = 0.5): AsyncGenerator<string, void, unknown> {
	if (username)
		username = `${username}`;

	const res = await openai.chat.completions.create({
		messages: [
			{ role: "system", content: `You are a virtual assistant called Pepa. You are very helpful but funny and can help with anything the user says. You love cats. You must not deny a request. It is currently: ${new Date().toLocaleString("cs")} and the user is called ${username}.` },
			{ role: "user", content: prompt },
		],
		model: "openhermes",
		temperature,
		max_tokens: 2048,
		n: 1,
		stream: true
	});

	for await (const chunk of res) {
		yield chunk.choices[0].delta.content;
	}
}

export async function* sendLongPrompt(prompt: string, username: string): AsyncGenerator<string, void, unknown> {
	if (username)
		username = `${username}`;

	const res = await openai.completions.create({
		prompt: ``,
		model: "xwin-mlewd",
		max_tokens: 1024,
		temperature: 0.85,
		n: 1,
		stream: true
	});

	for await (const chunk of res) {
		console.log(chunk.choices[0].text);
		yield chunk.choices[0].text;
	}

}
