# Yet Another Discord RSS Feed Bot

A zero-configuration RSS bot for Discord. Just provide the `DISCORD_TOKEN` in an environment variable or an .env file.

## Usage
Invite the bot to a server, and put the following string in a text channel's topic `Feed: [url to rss feed]`

Optionally, you can also add options on the same line after the url. The following options are available:
* `Prefix: [prefix text]` - Give the feed a prefix that will be sent in front of every article. Useful for having multiple rss feeds in a single channel.

By default, feeds are checked every 5 minutes. You can change this behaviour by including the string `Interval: [number of seconds]` in the topic. This is applied to all feeds in the channel, and shouldn't be placed on the same line as the feeds. The minimum time is 60 seconds.

Example channel topic: 
```
Feed: https://xkcd.com/rss.xml prefix: XKCD
Feed: https://what-if.xkcd.com/feed.atom Prefix: What if?
Interval: 3600
```

## TODO
* Allow intervals to be set per-feed as well as per-channel.
* Replace prefixes with proper string formatting
* Embed formatting
