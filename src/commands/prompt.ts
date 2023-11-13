import { ChatInputCommandInteraction, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import translate from 'google-translate-api-x';
import { sendPrompt } from "../sendPrompt";

const avgWordLength = 8.05;
const maxWordLength = 20;
const maxWords = 81;
const maxChars = maxWords * avgWordLength;

let eventCount = 0;
const counters = new Map<string, number>();

export const cmdPrompt = {
	data: new SlashCommandBuilder()
		.setName("prompt")
		.setDescription("Send a prompt")
		.addStringOption(new SlashCommandStringOption()
			.setRequired(true)
			.setName("text")
			.setDescription(`The prompt text. Max ${maxWords} words.`)
			.setMaxLength(maxChars))
		.addBooleanOption(new SlashCommandBooleanOption()
			.setName("ppp")
			.setDescription("Pre process the prompt? (translate) [default True]"))
		.addBooleanOption(new SlashCommandBooleanOption()
			.setName("ppr")
			.setDescription("Post process the response? (translate) [default True]")),

	async execute(interaction: ChatInputCommandInteraction) {
		const ppp = interaction.options.getBoolean("ppp") ?? true;
		const ppr = interaction.options.getBoolean("ppr") ?? true;
		const content = interaction.options.getString("text").substring(0, maxChars)
			.split(" ")
			.map(s => s.trim()) // remove whitespace
			.map(s => s.length > maxWordLength ? s.substring(0, maxWordLength) : s) // truncate strings to 20 characters
			.filter(s => s.length > 0) // filter out empty strings
			.slice(0, maxWords)
			.join(" ");

		const username = interaction.user.username;
		const displayName = interaction.user.displayName;
		let prompt = content;
		if (ppp)
			prompt = (await translate(content, { to: "en", autoCorrect: true })).text;

		eventCount++;
		const eventNumber = (counters.get(username) ?? 0) + 1;
		counters.set(username, eventNumber);

		console.info(`${eventCount.toString().padStart(3, "0")} [${username} ${eventNumber}] ${prompt}`);

		// todo: message thread support

		try {
			const reply = await interaction.reply(`[${eventCount.toString().padStart(3, "0")} <:cattTTottoo:1173400051482112101> ${eventNumber}] Thinking...`);

			sendPrompt(prompt, username, displayName).then(async res => {
				let text = res[0];
				if (ppr)
					text = (await translate(text, { to: "cs" })).text;

				console.debug(`### [${username} ${eventNumber} 1] ${res[0]}`);
				console.info(`<<< [${username} ${eventNumber}] ${text}`);
				try {
					await reply.edit(text);
				}
				catch (e) {
					console.error(e);
				}
			});
		}
		catch (e) {
			console.error(e);
		}
	}
}