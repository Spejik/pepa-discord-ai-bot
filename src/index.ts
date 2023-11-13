import { Client, Collection, GatewayIntentBits, REST, Routes } from "discord.js";
import { configDotenv } from "dotenv";
import { cmdPrompt } from "./commands/prompt";
configDotenv();

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

type ClientT = Client & { commands: Collection<string, any> };

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
}) as ClientT;

// register commands
client.commands = new Collection();
client.commands.set(cmdPrompt.data.name, cmdPrompt);

const rest = new REST().setToken(token);
(async () => {
	await client.login(token);

	try {
		console.time("refresh commands");

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationGuildCommands(client.user.id, guildId),
			{ body: [...client.commands.values()].map(c => c.data.toJSON()) },
		);

		console.timeLog("refresh commands", `Successfully reloaded application commands.`);
	} catch (error) {
		console.error(error);
	}
})();

// ready handler
client.on("ready", async (c) => {
	console.log("Logged in as " + c.user.tag);

	// Manual message delete
	const channel = await c.channels.resolve("1017438358596755497").fetch()
	if (!channel.isTextBased()) return;
	(await channel.messages.fetch("1173411425507627089")).delete();
});

// chat input command handler
client.on("interactionCreate", async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});


