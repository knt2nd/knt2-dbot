# Kanata 2nd Discord Bot

Extensible multi-language Discord voice bot

[Demo Movie (Developer's Tweet)](https://twitter.com/knt2nd/status/1369255050414092292)

## Features

- Google Cloud Text-to-Speech, 220+ voices, 40+ languages
- Smart speaker-ish chat command, "OKanata, change my voice"
- Command restriction by access control list
- Multi-server configuration
- Extensible plugin system to easily develop in multiple languages
- Builtin plugins support English, Japanese 日本語, Simplified Chinese 简体中文, and Traditional Chinese 繁體中文

## Builtin plugin features

| Name      | Description                    |
| -         | -                              |
| voice     | Voice changer                  |
| read      | User dictionary, format, etc   |
| res       | Auto reply, reaction           |
| vc        | Auto join, leave, etc          |
| config    | Online configuration           |
| gctts     | Switch TTS to Google Cloud TTS |
| firestore | Switch datastore to Firestore  |
| help      | Help command                   |
| system    | System commands                |

## Requirements

- [Node.js](https://nodejs.org/) v14 or higher

## Prepare Discord bot

1. Go to [Discord Developer Portal](https://discordapp.com/developers/applications/)
1. Click the **New Application** button
1. Input a bot name as you want and **Create**
1. Go to the **Bot** page, and click the **Add Bot** button
1. Click "**Yes, do it!**"
1. Click the **Copy** button to get your bot token (and set to your `env.yml` later)
1. Disable the **PUBLIC BOT** option unless you want to make it public
1. Go to the **OAuth2** page, and check the **bot** option, and click the **Copy** button to copy URL
1. Paste to your browser address bar and go to there
1. Select the server you want to invite, and click the **Authorize** button

## Prepare Google Cloud TTS

Follow [the official document instructions](https://cloud.google.com/text-to-speech/docs/before-you-begin). You don't have to set the environment though. All you need to do is create a JSON file. Then place the file as `credential.json` in this project.

Note: Google Cloud TTS is not free but *almost* free. You don't have to worry about payment when your bot is private. cf. [Pricing](https://cloud.google.com/text-to-speech/pricing)

## Environment

Copy `example-env/[lang].[type].yml` as `env.yml` and set your own ENV.

- `[lang].private.yml` is a private bot template
  - Server admins are trustable
  - Server users are mostly trustable
- `[lang].public.yml` is a public bot template
  - Even server admins are not trustable
  - Server users are possibly malicious

## Permissions

Basically, the bot requires the following permissions.

- Text Channel
  - Send Messages
  - Embed Links
  - Attach Files
  - Add Reactions
  - Manage Messages
  - Read Message History
- Voice Channel
  - Connect
  - Speak

## Install and lunch

```sh
npm run init
npm start
```

## Development

```sh
npm run dev     # Launch with development ENV
npm run lint    # Lint codes
npm run beatify # Beatify codes
```

## Plugin install

```sh
cd plugins
git clone __PLUGIN_REPO__
cd ..
npm run init
```

## Plugin development

Copy `example-plugin` as `plugins/example` and run `npm run init` and see the [example codes](example-plugin/).

## References

- [Discord.js](https://discord.js.org/#/docs)
- [Google Cloud Text-to-Speech](https://cloud.google.com/text-to-speech/docs/)

## License

[MIT](LICENSE)

## About author

Name: Kanata  
Language: Japanese(native) English(intermediate) Chinese(basic)  
Discord: Kanata#3360  
Twitter: https://twitter.com/knt2nd  
GitHub: https://github.com/knt2nd  
