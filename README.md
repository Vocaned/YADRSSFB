# Yet Another Discord RSS Feed Bot

A zero-configuration rss bot for discord. Just provide the `DISCORD_TOKEN` in an environment variable or an .env file.

## Usage
Invite the bot to a server, and put the following string in a text channel's topic `Feed: [url to rss feed]`

Optionally, you can also add options on the same line after the url. The following options are available:
* `Prefix: [prefix text]` - Give the feed a prefix that will be sent in front of every article. Useful for having multiple rss feeds in a single channel.