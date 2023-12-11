// import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, MessagePayload, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { ChatInputCommandInteraction, MessagePayload, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import translate from 'google-translate-api-x';
import { sendPrompt } from "../sendPrompt";
import { contexts } from "./contexts";

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
		.addStringOption(new SlashCommandStringOption()
			.setName("temp")
			.addChoices(
				{ name: "Precise", value: "0.1" },
				{ name: "Focused and deterministic", value: "0.2" },
				{ name: "Balanced", value: "0.35" },
				{ name: "Creative and random", value: "0.6" },
				{ name: "Deranged and lobotomized", value: "0.75" },
				{ name: "Omega Ultra Mega Lobotomy Pro Max Plus", value: "0.9" }
			)
			.setDescription("Controls the temperature of the model. [default Balanced]"))
		.addStringOption(new SlashCommandStringOption()
			.setName("ctx") // TODO: implement
			.addChoices(...Object.keys(contexts)
				.map((name) => ({ name, value: name })))
			.setDescription("Additional context to use for the prompt. Defaults to none."))
		.addBooleanOption(new SlashCommandBooleanOption()
			.setName("ppp")
			.setDescription("Pre-process the prompt? (translate) [default False]"))
		.addBooleanOption(new SlashCommandBooleanOption()
			.setName("ppr")
			.setDescription("Post-process the response? (translate) [default False]")),

	async execute(interaction: ChatInputCommandInteraction) {
		const chalk = (await import("chalk")).default;

		// In case the model doesn't handle anything else than english well, translate it
		const ppp = interaction.options.getBoolean("ppp") ?? false;
		const ppr = interaction.options.getBoolean("ppr") ?? false;
		const content = interaction.options.getString("text").substring(0, maxChars)
			.split(" ")
			.map(s => s.trim()) // remove whitespace
			.map(s => s.length > maxWordLength ? s.substring(0, maxWordLength) : s) // truncate strings to 20 characters
			.filter(s => s.length > 0) // filter out empty strings
			.slice(0, maxWords)
			.join(" ");

		const username = interaction.user.username;

		const eventId = ++eventCount;
		const eventNumber = (counters.get(username) ?? 0) + 1;
		counters.set(username, eventNumber);

		try {
			let waitingMessage = `[${eventId.toString().padStart(3, "0")} <:cattTTottoo:1173400051482112101> ${eventNumber}] Thinking...`;
			const reply = await interaction.reply(waitingMessage + " *(waiting to start)*");

			// get prompt, optionally translate
			let prompt = content;
			if (ppp)
				prompt = (await translate(content, { to: "en", autoCorrect: true })).text;
			prompts.set(eventId, prompt);

			console.info(chalk.bgCyanBright(eventId.toString().padStart(3, "0")),
				`[${chalk.gray(username)} ${chalk.yellow(eventNumber)}]`, prompt);

			// todo: message thread support

			const rawTemp = interaction.options.getString("temp");
			let temp = +rawTemp || 0.4;
			temp = Math.min(Math.max(temp, 0.01), 0.99);

			const ctxOption = interaction.options.getString("ctx");
			const additionalContext = ctxOption ? contexts[ctxOption] : "";

			const requestBegin = Date.now();
			const response = sendPrompt(prompt, username, temp, additionalContext);

			let firstUpdate = 0;
			let lastUpdate = Date.now();
			let totalChunks = 0;
			let responseText = "";
			let chunkSizes: number[] = [];

			for await (const r of response) {
				if (firstUpdate === 0)
					firstUpdate = Date.now();
				totalChunks++;

				if (!r)
					continue;
				responseText += r;
				chunkSizes.push(r.length);

				console.debug(chalk.greenBright("###"),
					`[${chalk.gray(username)} ${chalk.yellow(eventNumber)} ${chalk.greenBright(totalChunks)}]`, responseText);

				// Periodically update the message while waiting for the response
				const now = Date.now();
				if (now - lastUpdate > 5000) {
					lastUpdate = now;
					try {
						await reply.edit(waitingMessage += `${totalChunks}...`);
					}
					catch (e) {
						console.error(e);
					}
				}
			}

			// Optionally translate the response back to the user's language
			const text = ppr
				? (await translate(responseText, { to: "cs" })).text
				: responseText;

			console.info(chalk.cyanBright("<<<"), `[${chalk.gray(username)} ${chalk.yellow(eventNumber)}]`, text);

			try {
				// TODO: implement regenerate + edit/delete (from internal history)
				// const regenerateBtn = new ButtonBuilder()
				// 	.setCustomId(`regenerate:${eventId}`)
				// 	.setLabel("Regenerate")
				// 	.setEmoji("🔁")
				// 	.setStyle(ButtonStyle.Secondary);

				// const row = new ActionRowBuilder<ButtonBuilder>()
				// 	.addComponents(regenerateBtn);

				// Append various stats to the message
				const now = Date.now();
				const requestTime = (now - requestBegin) / 1000;
				const time = (now - firstUpdate) / 1000;
				const length = responseText.length;
				const words = responseText.split(" ").length;
				const avgWordsPerSec = (words / time).toFixed(2);
				const totalWordLength = responseText.split(" ").map(s => s.length).reduce((a, b) => a + b, 0);
				const avgWordLength = (totalWordLength / words).toFixed(2);
				const avgCharPerSec = (length / time).toFixed(2);
				const avgChunkSize = chunkSizes.reduce((a, b) => a + b, 0) / totalChunks;
				const avgChunksPerSec = (totalChunks / time).toFixed(2);
				const maxChunkSize = Math.max(...chunkSizes);

				const debug = `||\`${totalChunks}ch@${time.toFixed(3)}s(${requestTime.toFixed(3)}s), l=${length}c(wl=${totalWordLength},w=${words}) awl=${avgWordLength} ${avgWordsPerSec}w/s ${avgCharPerSec}c/s achl=${avgChunkSize.toFixed(2)} ${avgChunksPerSec}ch/s mxchl=${maxChunkSize}\`||`;

				const overflow = text.length > 1990;
				const messageText = overflow
					? text.slice(0, 1990 - debug.length) + "...[EOL]"
					: text;

				const payload = MessagePayload.create(interaction, {
					content: messageText + (text.endsWith("\n") ? "" : "\n") + debug,
					// components: [row]
				});
				await reply.edit(payload);
			}
			catch (e) {
				console.error(e);
			}
		}
		catch (e) {
			console.error(e);
		}
	}
}