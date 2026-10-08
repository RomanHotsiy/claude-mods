# claude-mods

[Claude Code mods](https://claude.dev/blog/getting-started-with-claude-code-mods/) by Roman Hotsiy.

| Mod | What it does |
| --- | --- |
| [loc-split](loc-split) | Lines changed against `main`, split into code, comments, tests, docs and generated files, in a row above the prompt that opens into a per-commit table |

![loc-split](assets/loc-split.png)

## Install

### Claude desktop app

1. Open **Settings**.
2. Type `plugins` and press Enter.
3. In the top right corner, click **Add**.
4. Enter `RomanHotsiy/claude-mods` and click **Sync**.
5. You should now see **Loc split** in the list.

### Claude Code in a terminal

```
/plugin marketplace add RomanHotsiy/claude-mods
/plugin install loc-split@claude-mods
/reload-plugins
```

Mods run inside Claude Code with the same access it has; read a mod's source before you install it.

## License

[MIT](LICENSE)
