// import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, MessagePayload, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { ChatInputCommandInteraction, MessagePayload, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import translate from 'google-translate-api-x';
import { sendPrompt } from "../sendPrompt";

const avgWordLength = 8.05;
const maxWordLength = 20;
const maxWords = 128;
const maxChars = maxWords * avgWordLength;

let eventCount = 0;
// username => individual event count
const counters = new Map<string, number>();
// eventId => prompt
const prompts = new Map<number, string>();

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
			.setDescription("Post process the response? (translate) [default False]")),

	async execute(interaction: ChatInputCommandInteraction) {
		const chalk = (await import("chalk")).default;

		const ppp = interaction.options.getBoolean("ppp") ?? true;
		const ppr = interaction.options.getBoolean("ppr") ?? false;
		const content = interaction.options.getString("text").substring(0, maxChars)
			.split(" ")
			.map(s => s.trim()) // remove whitespace
			.map(s => s.length > maxWordLength ? s.substring(0, maxWordLength) : s) // truncate strings to 20 characters
			.filter(s => s.length > 0) // filter out empty strings
			.slice(0, maxWords)
			.join(" ");

		const username = interaction.user.username;
		const displayName = interaction.user.displayName;

		const eventId = ++eventCount;
		const eventNumber = (counters.get(username) ?? 0) + 1;
		counters.set(username, eventNumber);

		try {
			const reply = await interaction.reply(`[${eventId.toString().padStart(3, "0")} <:cattTTottoo:1173400051482112101> ${eventNumber}] Thinking...`);

			// get prompt, optionally translate
			let prompt = content;
			if (ppp)
				prompt = (await translate(content, { to: "en", autoCorrect: true })).text;
			prompts.set(eventId, prompt);

			console.info(chalk.cyan(eventId.toString().padStart(3, "0")), `[${chalk.gray(username)} ${chalk.yellow(eventNumber)}]`, prompt);

			// todo: message thread support

			sendPrompt(prompt, username, displayName).then(async res => {
				let text = res[0];
				if (ppr)
					text = (await translate(text, { to: "cs" })).text;

				console.debug(chalk.bgGreen("###"), `[${chalk.gray(username)} ${chalk.yellow(eventNumber)}]`, res[0]);
				console.info(chalk.cyanBright("<<<"), `[${chalk.gray(username)} ${chalk.yellow(eventNumber)}]`, text);

				try {
					// const regenerateBtn = new ButtonBuilder()
					// 	.setCustomId(`regenerate:${eventId}`)
					// 	.setLabel("Regenerate")
					// 	.setEmoji("🔁")
					// 	.setStyle(ButtonStyle.Secondary);

					// const row = new ActionRowBuilder<ButtonBuilder>()
					// 	.addComponents(regenerateBtn);

					const payload = MessagePayload.create(interaction, {
						content: text,
						// components: [row]
					});
					await reply.edit(payload);
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