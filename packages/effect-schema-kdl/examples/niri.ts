import { KdlSchema, kdl } from "@kbroom/effect-schema-kdl"
import { Effect, Schema, SchemaIssue } from "effect"

const standardSchemaFormatter = SchemaIssue.makeFormatterStandardSchemaV1()

const Output = KdlSchema.Node("output", {
  name: KdlSchema.Arg(0, KdlSchema.V(Schema.String)),
  off: KdlSchema.optional(KdlSchema.Opt("off", KdlSchema.V(Schema.Boolean))),
  mode: KdlSchema.optional(KdlSchema.Opt("mode", KdlSchema.V(Schema.String))),
  scale: KdlSchema.optional(KdlSchema.Opt("scale", KdlSchema.V(Schema.Number))),
  transform: KdlSchema.optional(
    KdlSchema.Opt("transform", KdlSchema.V(Schema.String)),
  ),
  position: KdlSchema.optional(
    KdlSchema.Opt("position", KdlSchema.V(Schema.String)),
  ),
  variableRefreshRate: KdlSchema.optional(
    KdlSchema.Opt("variable-refresh-rate", KdlSchema.V(Schema.Boolean)),
  ),
  focusAtStartup: KdlSchema.optional(
    KdlSchema.Opt("focus-at-startup", KdlSchema.V(Schema.Boolean)),
  ),
  backgroundColor: KdlSchema.optional(
    KdlSchema.Opt("background-color", KdlSchema.V(Schema.String)),
  ),
  backdropColor: KdlSchema.optional(
    KdlSchema.Opt("backdrop-color", KdlSchema.V(Schema.String)),
  ),
})

const Workspace = KdlSchema.Node("workspace", {
  name: KdlSchema.Arg(0, KdlSchema.V(Schema.String)),
  openOnOutput: KdlSchema.optional(
    KdlSchema.Opt("open-on-output", KdlSchema.V(Schema.String)),
  ),
})

const SpawnAtStartup = KdlSchema.Node("spawn-at-startup", {
  program: KdlSchema.Arg(0, KdlSchema.V(Schema.String)),
})

const WindowRuleMatch = KdlSchema.Node("match", {
  title: KdlSchema.optional(KdlSchema.Opt("title", KdlSchema.V(Schema.String))),
  appId: KdlSchema.optional(
    KdlSchema.Opt("app-id", KdlSchema.V(Schema.String)),
  ),
  isActive: KdlSchema.optional(
    KdlSchema.Opt("is-active", KdlSchema.V(Schema.Boolean)),
  ),
  isFocused: KdlSchema.optional(
    KdlSchema.Opt("is-focused", KdlSchema.V(Schema.Boolean)),
  ),
  isFloating: KdlSchema.optional(
    KdlSchema.Opt("is-floating", KdlSchema.V(Schema.Boolean)),
  ),
  isUrgent: KdlSchema.optional(
    KdlSchema.Opt("is-urgent", KdlSchema.V(Schema.Boolean)),
  ),
  atStartup: KdlSchema.optional(
    KdlSchema.Opt("at-startup", KdlSchema.V(Schema.Boolean)),
  ),
})

const WindowRule = KdlSchema.Node("window-rule", {
  matches: KdlSchema.Many(WindowRuleMatch),
  openOnOutput: KdlSchema.optional(
    KdlSchema.Opt("open-on-output", KdlSchema.V(Schema.String)),
  ),
  openOnWorkspace: KdlSchema.optional(
    KdlSchema.Opt("open-on-workspace", KdlSchema.V(Schema.String)),
  ),
  openMaximized: KdlSchema.optional(
    KdlSchema.Opt("open-maximized", KdlSchema.V(Schema.Boolean)),
  ),
  openFullscreen: KdlSchema.optional(
    KdlSchema.Opt("open-fullscreen", KdlSchema.V(Schema.Boolean)),
  ),
  openFloating: KdlSchema.optional(
    KdlSchema.Opt("open-floating", KdlSchema.V(Schema.Boolean)),
  ),
  openFocused: KdlSchema.optional(
    KdlSchema.Opt("open-focused", KdlSchema.V(Schema.Boolean)),
  ),
  opacity: KdlSchema.optional(
    KdlSchema.Opt("opacity", KdlSchema.V(Schema.Number)),
  ),
})

const Cursor = KdlSchema.Node("cursor", {
  xcursorTheme: KdlSchema.optional(
    KdlSchema.Opt("xcursor-theme", KdlSchema.V(Schema.String)),
  ),
  xcursorSize: KdlSchema.optional(
    KdlSchema.Opt("xcursor-size", KdlSchema.V(Schema.Number)),
  ),
  hideWhenTyping: KdlSchema.optional(
    KdlSchema.Opt("hide-when-typing", KdlSchema.V(Schema.Boolean)),
  ),
  hideAfterInactiveMs: KdlSchema.optional(
    KdlSchema.Opt("hide-after-inactive-ms", KdlSchema.V(Schema.Number)),
  ),
})

const Keyboard = KdlSchema.Node("keyboard", {
  repeatDelay: KdlSchema.optional(
    KdlSchema.Opt("repeat-delay", KdlSchema.V(Schema.Number)),
  ),
  repeatRate: KdlSchema.optional(
    KdlSchema.Opt("repeat-rate", KdlSchema.V(Schema.Number)),
  ),
  trackLayout: KdlSchema.optional(
    KdlSchema.Opt("track-layout", KdlSchema.V(Schema.String)),
  ),
  numlock: KdlSchema.optional(
    KdlSchema.Opt("numlock", KdlSchema.V(Schema.Boolean)),
  ),
})

const Xkb = KdlSchema.Node("xkb", {
  layout: KdlSchema.Opt("layout", KdlSchema.V(Schema.Literals(["us", "uz"]))),
  variant: KdlSchema.optional(
    KdlSchema.Opt("variant", KdlSchema.V(Schema.String)),
  ),
  options: KdlSchema.optional(
    KdlSchema.Opt("options", KdlSchema.V(Schema.String)),
  ),
  file: KdlSchema.optional(KdlSchema.Opt("file", KdlSchema.V(Schema.String))),
})

const Touchpad = KdlSchema.Node("touchpad", {
  off: KdlSchema.optional(KdlSchema.Opt("off", KdlSchema.V(Schema.Boolean))),
  tap: KdlSchema.optional(KdlSchema.Opt("tap", KdlSchema.V(Schema.Boolean))),
  dwt: KdlSchema.optional(KdlSchema.Opt("dwt", KdlSchema.V(Schema.Boolean))),
  dwtp: KdlSchema.optional(KdlSchema.Opt("dwtp", KdlSchema.V(Schema.Boolean))),
  naturalScroll: KdlSchema.optional(
    KdlSchema.Opt("natural-scroll", KdlSchema.V(Schema.Boolean)),
  ),
  accelSpeed: KdlSchema.optional(
    KdlSchema.Opt("accel-speed", KdlSchema.V(Schema.Number)),
  ),
  accelProfile: KdlSchema.optional(
    KdlSchema.Opt("accel-profile", KdlSchema.V(Schema.String)),
  ),
  scrollMethod: KdlSchema.optional(
    KdlSchema.Opt("scroll-method", KdlSchema.V(Schema.String)),
  ),
  scrollFactor: KdlSchema.optional(
    KdlSchema.Opt("scroll-factor", KdlSchema.V(Schema.Number)),
  ),
  leftHanded: KdlSchema.optional(
    KdlSchema.Opt("left-handed", KdlSchema.V(Schema.Boolean)),
  ),
  middleEmulation: KdlSchema.optional(
    KdlSchema.Opt("middle-emulation", KdlSchema.V(Schema.Boolean)),
  ),
})

const Mouse = KdlSchema.Node("mouse", {
  off: KdlSchema.optional(KdlSchema.Opt("off", KdlSchema.V(Schema.Boolean))),
  naturalScroll: KdlSchema.optional(
    KdlSchema.Opt("natural-scroll", KdlSchema.V(Schema.Boolean)),
  ),
  accelSpeed: KdlSchema.optional(
    KdlSchema.Opt("accel-speed", KdlSchema.V(Schema.Number)),
  ),
  accelProfile: KdlSchema.optional(
    KdlSchema.Opt("accel-profile", KdlSchema.V(Schema.String)),
  ),
  leftHanded: KdlSchema.optional(
    KdlSchema.Opt("left-handed", KdlSchema.V(Schema.Boolean)),
  ),
  middleEmulation: KdlSchema.optional(
    KdlSchema.Opt("middle-emulation", KdlSchema.V(Schema.Boolean)),
  ),
})

const Misc = KdlSchema.Node("misc", {
  disablePowerKeyHandling: KdlSchema.optional(
    KdlSchema.Opt("disable-power-key-handling", KdlSchema.V(Schema.Boolean)),
  ),
  warpMouseToFocus: KdlSchema.optional(
    KdlSchema.Opt("warp-mouse-to-focus", KdlSchema.V(Schema.Boolean)),
  ),
  focusFollowsMouse: KdlSchema.optional(
    KdlSchema.Opt("focus-follows-mouse", KdlSchema.V(Schema.Boolean)),
  ),
  workspaceAutoBackAndForth: KdlSchema.optional(
    KdlSchema.Opt("workspace-auto-back-and-forth", KdlSchema.V(Schema.Boolean)),
  ),
  modKey: KdlSchema.optional(
    KdlSchema.Opt("mod-key", KdlSchema.V(Schema.String)),
  ),
  modKeyNested: KdlSchema.optional(
    KdlSchema.Opt("mod-key-nested", KdlSchema.V(Schema.String)),
  ),
  preferNoCsd: KdlSchema.optional(
    KdlSchema.Opt("prefer-no-csd", KdlSchema.V(Schema.Boolean)),
  ),
  screenshotPath: KdlSchema.optional(
    KdlSchema.Opt("screenshot-path", KdlSchema.V(Schema.String)),
  ),
  environment: KdlSchema.optional(
    KdlSchema.Opt("environment", KdlSchema.V(Schema.String)),
  ),
})

const Config = KdlSchema.Document({
  outputs: KdlSchema.Many(Output),
  workspaces: KdlSchema.Many(Workspace),
  windowRules: KdlSchema.Many(WindowRule),
  spawnAtStartup: KdlSchema.Many(SpawnAtStartup),
  cursor: KdlSchema.optional(Cursor),
  keyboard: KdlSchema.optional(Keyboard),
  xkb: Xkb,
  touchpad: KdlSchema.optional(Touchpad),
  mouse: KdlSchema.optional(Mouse),
  misc: KdlSchema.optional(Misc),
})

const decoder = KdlSchema.decodeSourceResult(Config)

const program = Effect.gen(function* () {
  const config = kdl`
output "eDP-1" {
    mode "1920x1080"
    scale 2.0
    focus-at-startup
    backdrop-color "#111111"
}

output "HDMI-A-1" {
    mode "2560x1440@143.912"
    scale 1.5
    position x=1920 y=0
    variable-refresh-rate
}

keyboard {
    repeat-delay 600
    repeat-rate 25
    numlock
}

xkb {
    layout "us"
    variant "colemak_dh_ortho"
}

touchpad {
    tap
    natural-scroll
    accel-speed 0.2
}

mouse {
    accel-speed 0.2
}

misc {
    focus-follows-mouse
    warp-mouse-to-focus
    prefer-no-csd
    screenshot-path "~/Pictures/Screenshots/Screenshot from %Y-%m-%d %H-%M-%S.png"
}

workspace "browser" {
    open-on-output "HDMI-A-1"
}

workspace "chat" {
    open-on-output "eDP-1"
}

window-rule {
    match app-id="firefox"
    open-maximized
}

window-rule {
    match app-id="Alacritty"
    open-floating
}

window-rule {
    match title="^Picture-in-Picture$"
    open-floating
}

spawn-at-startup "waybar"
spawn-at-startup "dunst"
spawn-at-startup "alacritty"

cursor {
    xcursor-theme "breeze_cursors"
    xcursor-size 48
    hide-when-typing
}
`

  const result = yield* Effect.fromResult(decoder(config)).pipe(
    Effect.mapError(standardSchemaFormatter),
  )

  // const result = yield* Effect.fromResult(decoder(config))

  console.dir(result, { depth: null })
})

await Effect.runPromise(program)
