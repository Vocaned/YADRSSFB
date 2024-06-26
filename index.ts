import 'dotenv/config';
import { ShardClient } from 'detritus-client';
import Parser from 'rss-parser';
import fs from 'fs/promises';

let parser = new Parser({
  headers: { 'User-Agent': 'https://github.com/Vocaned/YADRSSFB' },
  timeout: 10 * 1000
});
const client = new ShardClient(process.env.DISCORD_TOKEN ?? '', {
  gateway: {
    presence: {
      activity: {
        type: 3, // Watching
        name: 'RSS feeds'
      }
    }
  },
  rest: {
    errorOnRatelimit: false
  }
});

const MINIMUM_INTERVAL = 60;
const DEFAULT_INTERVAL = 300;
const MAX_SEEN_COUNT = 1000; // TODO: Maximum cache size should be per-feed instead of per-channel

type ChannelData = {
  [channelId: string]: {
    seen: string[];
    lastcheck: number;
    firstpass: boolean;
  }
}
let channel_data: ChannelData = {};

interface FeedRegexResult {
  url: string,
  format: string
}
const FEED_REGEX = /feed: ?(?<url>https?:\/\/\S+)( format: ?(?<format>.+))?/gim
const INTERVAL_REGEX = /interval: ?(?<interval>\d+)/gim

let file_exists = async (path: string) => {
  try {
    await fs.access(path, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

let rss_tick = async () => {
  // Load state from .cache if it exists
  if (!Object.keys(channel_data).length && await file_exists('.cache')) {
    channel_data = JSON.parse((await fs.readFile('.cache')).toString('utf-8'));
  }

  for (let [_, guild] of client.guilds) {
    for (let [_, channel] of guild.textChannels) {
      if (!channel.topic || !channel.topic.match(FEED_REGEX)) continue; // No feeds found

      // Initialize default data for channel
      if (!(channel.id in channel_data)) channel_data[channel.id] = { "seen": [], lastcheck: 0, firstpass: true };
      let data = channel_data[channel.id];

      let interval = DEFAULT_INTERVAL;
      // Check if interval is present in topic
      let interval_regex = INTERVAL_REGEX.exec(channel.topic)?.groups?.interval;
      if (interval_regex) interval = parseInt(interval_regex);

      // Check if interval has passed
      if ((new Date().getTime() - data.lastcheck) / 1000 < interval) continue;
      data.lastcheck = new Date().getTime();

      // Parse each feed present in topic
      let groups: Partial<FeedRegexResult> | undefined;
      while (groups = FEED_REGEX.exec(channel.topic)?.groups) {
        if (!groups.url) continue;
        console.log(`Parsing feed ${groups.url}`)
        let feed;
        try {
          feed = await parser.parseURL(groups.url);
        } catch (e) {
          console.log(`Error trying to parse ${groups.url}: ${e}`);
          continue;
        }

        if (data.firstpass) {
          console.log(`Populating ${feed.title} SeenArticles with existing posts`)

          for (let item of feed.items) {
            let guid = item.guid ?? item.id ?? item.link ?? item.title;
            if (guid) data.seen.push(guid);
          }
          continue;
        }

        for (let item of feed.items.reverse()) {
          let guid = item.guid ?? item.id ?? item.link ?? item.title;
          if (!guid || data.seen.includes(guid)) continue; // Already seen

          let format: string;
          if (groups.format) format = groups.format;
          else {
            if (item.title && item.link) format = '[{title}]({link})';
            else if (item.title) format = '{title}'
            else if (item.link) format = '{link}'
            else continue; // No title or link in article, and no custom formatting given
          }
          let content = format;

          let format_key = /\{(?<key>.+?)\}/gi;
          let key: string | undefined;
          while (key = format_key.exec(format)?.groups?.key) {
            if (key && Object.keys(item).includes(key)) content = content.replace(`{${key}}`, item[key])
          }

          await channel.createMessage({ content: content });

          data.seen.push(guid);
          if (data.seen.length > MAX_SEEN_COUNT) data.seen.shift(); // Remove old entries
        }
      }
      data.firstpass = false;
    }
  }
  // Save state to .cache
  fs.writeFile('.cache', JSON.stringify(channel_data));
}

let rss_loop = async () => {
  setTimeout(async () => {
    try {
      await rss_tick();
    } catch (e) {
      console.log(e);
    }
    await rss_loop();
  }, MINIMUM_INTERVAL * 1000);
}

(async () => {
  try {
    await client.run();
    console.log(`${client.user?.username} connected to Discord`);
    await rss_tick();
    await rss_loop();
  } catch (e) {
    console.log(e);
  }
})();
