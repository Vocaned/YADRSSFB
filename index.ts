import 'dotenv/config';
import { ShardClient } from 'detritus-client';
import Parser from 'rss-parser';
import fs from 'fs/promises';

let parser = new Parser();
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
const MAX_SEEN_COUNT = 200;

type ChannelData = {
  [channelId: string]: {
    seen: string[];
    lastcheck: number;
    firstpass: boolean;
  }
}
let channel_data: ChannelData = {};

const FEED_REGEX = /feed: ?(https?:\/\/.+)/gim
const INTERVAL_REGEX = /interval: ?(\d+)/gim

let file_exists = async (path: string) => {
  try {
    await fs.access('.cache', fs.constants.F_OK);
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
      if (!(channel.id in channel_data)) channel_data[channel.id] = {"seen": [], lastcheck: 0, firstpass: true};
      let data = channel_data[channel.id];


      let interval = DEFAULT_INTERVAL;
      // Check if interval is present in topic
      let interval_regex = INTERVAL_REGEX.exec(channel.topic);
      if (interval_regex) interval = parseInt(interval_regex[1]);

      // Check if interval has passed
      if ((new Date().getTime() - data.lastcheck) / 1000 < interval) continue;
      data.lastcheck = new Date().getTime();

      // Parse each feed present in topic
      let feed_url: RegExpExecArray | null;
      while (feed_url = FEED_REGEX.exec(channel.topic)) {
        console.log(`Parsing feed ${feed_url[1]}`)
        let feed = await parser.parseURL(feed_url[1]);

        if (data.firstpass) {
          console.log(`Populating ${feed.title} SeenArticles with existing posts`)

          for (let item of feed.items) {
            data.seen.push(item.guid ?? item.link ?? item.title ?? '');
          }
          continue;
        }

        for (let item of feed.items.reverse()) {
          if ((item.title ?? item.link) === undefined) continue; // No title or link in article
          if (data.seen.includes(item.guid ?? item.link ?? item.title ?? '')) continue; // Already seen

          if (item.link) await channel.createMessage({content: `[${item.title ?? item.link}](${item.link})`});
          else await channel.createMessage({content: item.title});

          data.seen.push(item.guid ?? item.link ?? item.title ?? '');
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
    await rss_tick();
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
