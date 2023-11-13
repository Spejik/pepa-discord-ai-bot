import OpenAI from 'openai';

const openai = new OpenAI({
	baseURL: `http://localhost:4891/v1`,
	apiKey: "none"
});

/**
 * Sends a prompt to the server and returns the response.
 *
 * @param {string} prompt - The prompt to send to the server.
 * @param {string} [username] - The username to include in the prompt.
 * @return {Promise<string>} - The response from the server.
 */
export const sendPrompt = async (prompt: string, username?: string, displayName?: string): Promise<string[]> => {
	if (displayName)
		displayName = ` (aka ${displayName})`;
	if (username)
		username = `${username}${displayName} said: `;

	const res = await openai.completions.create({
		prompt: `You are a virtual assistant called Pepa. You are very helpful and can help with anything the user asks you. You love cats.

${username}${prompt}
### Response:\n`,
		model: "luna-ai-llama2",
		max_tokens: 256,
		temperature: 0.85,
		top_p: 0.69,
		n: 1
	});

	return res.choices.map(c => c.text);
}
