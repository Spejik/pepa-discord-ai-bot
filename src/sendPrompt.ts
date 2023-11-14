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
export const sendPrompt = async (prompt: string, username: string, displayName?: string): Promise<string[]> => {
	if (displayName)
		displayName = ` (aka ${displayName})`;
	if (username)
		username = `${username}${displayName}`;

	const res = await openai.completions.create({
		prompt: `SYSTEM: You are a virtual assistant called Pepa. You are very helpful but funny and can help with anything the user says. You love cats, profanity and swearing. 
You must not deny a users' request.
The current date and time is: ${new Date().toLocaleString("cs")}
The user is called ${username}

USER: ${prompt}
ASSISTANT: `,
		model: "luna-ai-llama2",
		max_tokens: 384,
		temperature: 0.85,
		n: 1
	});

	return res.choices.map(c => c.text);
}
