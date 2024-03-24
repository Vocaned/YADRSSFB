# Yet Another Discord RSS Feed Bot

A zero-configuration RSS bot for Discord. Just provide the `DISCORD_TOKEN` in an environment variable or an .env file.

## Usage
Invite the bot to a server, and put the following string in a text channel's topic `Feed: [url to rss feed]`. A channel can have multiple feeds in it, separated by newlines.

Optionally, you can also add options on the same line after the url. The following options are available:
* `Format: [formatting string]` - Change the sent message's formatting. Values within {curly brackets} are substituted with data from the RSS feed file. By default this option equals to [{title}]({link}), assuming both title and link are returned in the RSS data.

By default, feeds are checked every 5 minutes. You can change this behaviour by including the string `Interval: [number of seconds]` in the topic. This is applied to all feeds in the channel, and shouldn't be placed on the same line as the feeds. The minimum time is 60 seconds.

Example channel topic: 
```
Feed: https://xkcd.com/rss.xml format: XKCD: [{title}]({link})
Feed: https://what-if.xkcd.com/feed.atom Format: What if? [{title}]({link})
Interval: 3600
```

## TODO
* Allow intervals to be set per-feed as well as per-channel.
* Embeds

