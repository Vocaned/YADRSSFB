import 'dotenv/config';
import { ShardClient } from 'detritus-client';
import Parser from 'rss-parser';

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

type ChannelData = {
  [channelId: string]: {
    seen: string[];
    interval: number;
    lastcheck: Date;
    firstpass: boolean;
  }
}
let channel_data: ChannelData = {};

const FEED_REGEX = /feed: ?(https?:\/\/.+)/gim
const INTERVAL_REGEX = /interval: ?(\d+)/gim

let rss_tick = async () => {
  for (let [_, guild] of client.guilds) {
    for (let [_, channel] of guild.textChannels) {
      if (!channel.topic || !channel.topic.match(FEED_REGEX)) continue; // No feeds found

      // Initialize default data for channel
      if (!(channel.id in channel_data)) channel_data[channel.id] = {"seen": [], "interval": DEFAULT_INTERVAL, lastcheck: new Date(0), firstpass: true};
      let data = channel_data[channel.id];

      // Check if interval is present in topic
      let interval_regex = INTERVAL_REGEX.exec(channel.topic);
      if (interval_regex) data.interval = parseInt(interval_regex[1]);

      // Check if interval has passed
      if ((new Date().getTime() - data.lastcheck.getTime()) / 1000 < data.interval) continue;
      data.lastcheck = new Date();

      // Parse each feed present in topic
      let feed_url: RegExpExecArray | null;
      while (feed_url = FEED_REGEX.exec(channel.topic)) {
        console.log(`Parsing feed ${feed_url[1]}`)
        let feed = await parser.parseURL(feed_url[1]);

        if (data.firstpass) {
          console.log(`Populating ${feed.title} SeenArticles with existing posts`)

          for (let item of feed.items) {
            data.seen.push(item.link ?? item.title ?? '');
          }
          continue;
        }

        for (let item of feed.items.reverse()) {
          if ((item.title ?? item.link) === undefined) continue; // No title or link in article
          if (data.seen.includes(item.link ?? item.title ?? '')) continue; // Already seen

          if (item.link) await channel.createMessage({content: `[${item.title ?? item.link}](${item.link})`});
          else await channel.createMessage({content: item.title});

          data.seen.push(item.link ?? item.title ?? '');
        }
      }
      data.firstpass = false;
    }
  }
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
