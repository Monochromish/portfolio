// left, top and width in percent of the composition box, then tilt in degrees
export interface Pose {
  x: number
  y: number
  width: number
  rx: number
  ry: number
  rz: number
}

export interface Shot {
  // served from /work/<file>-<width>.webp
  file: string
  widths: number[]
  width: number
  height: number
  alt: string
  light?: { file: string, alt: string }
  wide: Pose
  narrow: Pose
}

export interface Project {
  slug: string
  name: string
  role: string
  org: string
  period: string
  summary: string
  points: string[]
  stats?: { value: string, label: string, note?: string }[]
  links: { label: string, href: string }[]
  footnote?: { id: string, text: string, link?: { label: string, href: string } }
  note?: string
  field: string
  ink: string
  glow?: string
  // the aspect ratio of the composition in each layout
  stage?: { wide: string, narrow: string }
  shots: Shot[]
}

export const projects: Project[] = [
  {
    slug: 'cider',
    name: 'Cider',
    role: 'Senior Lead Developer',
    org: 'Cider Collective',
    period: 'Nov 2022 to now',
    summary: 'Cider is a paid Apple Music client for Windows, macOS and Linux. I\u00a0work across its Vue interface and its Electron and .NET apps.',
    points: [
      'Led the rebuild of the app’s settings system, replacing eight hand-built pages with typed setting lists that later categories also use, and rewrote its search to handle typos, accents and languages written without spaces.',
      'Built features from the interface to the Electron app: library sorting and search, saving the queue as a playlist, editorial album banners, and its first tray, menu bar and keyboard shortcuts.',
      'Built Cider’s current Google Cast support, first shipped to stable in July 2026 as an opt-in feature: a CastV2 sender in TypeScript and C#, TV playback with synced lyrics, and a permission flow that keeps Apple Music credentials off\u00a0the\u00a0TV.',
      'Refactored the audio engine’s effects chain, fixing Dolby Atmos compatibility, clipping and memory leaks; in the Windows app, stopped WebView2 from painting while hidden, released leaked audio sessions and fixed menus on high-\u2060DPI screens.',
    ],
    stats: [
      { value: 'Close to a million', label: 'users', note: 'cider-count' },
      { value: '250,000+', label: 'on Flathub' },
    ],
    links: [{ label: 'cider.sh', href: 'https://cider.sh' }],
    footnote: {
      id: 'cider-count',
      text: 'An estimate. Cider’s license server counts each license once, by a hash, when it checks in. Only copies on the newer service report to it, so Cider v3 from the Microsoft Store is not in the count. The Flathub figure is Flathub’s own count of installs since March 2022, not counting updates. To check it, select Downloads/Month on',
      link: { label: 'Cider’s Flathub page', href: 'https://flathub.org/apps/sh.cider.Cider' },
    },
    field: '#b8354d',
    ink: '#ffffff',
    glow: '#f2785c',
    stage: { wide: '1040 / 440', narrow: '300 / 230' },
    shots: [
      {
        file: 'cider-album',
        widths: [800, 1600, 1920],
        width: 1920,
        height: 1080,
        alt: 'Cider on Windows in dark mode, tinted by the album’s warm colors, showing Popstar by Tinashe: the cover, Play and Shuffle buttons and the track list, with Melatonin playing in the floating bar at the bottom and the queue of what plays next in a panel along the right edge.',
        light: {
          file: 'cider-album-light',
          alt: 'Cider on Windows in light mode, showing the album Popstar by Tinashe: the cover, Play and Shuffle buttons and the track list, with Melatonin playing in the floating bar at the bottom and the queue of what plays next in a panel along the right edge.',
        },
        wide: { x: 3, y: 2, width: 60, rx: 10, ry: 16, rz: -3 },
        narrow: { x: 0, y: 3, width: 80, rx: 10, ry: 14, rz: -3 },
      },
      {
        file: 'cider-lyrics',
        widths: [800, 1600, 1920],
        width: 1920,
        height: 1080,
        alt: 'Cider’s fullscreen lyrics view, tinted green, playing Vueltas by Not For Radio: the album’s artwork fills the window, the current line is set large on a frosted panel to the right with its words lighting up green as they are sung, and the playback bar floats along the bottom.',
        wide: { x: 43, y: 42, width: 54, rx: 12, ry: -18, rz: 4 },
        narrow: { x: 30, y: 45, width: 70, rx: 12, ry: -16, rz: 4 },
      },
    ],
  },
  {
    slug: 'nittany-motorsports',
    name: 'Nittany Motorsports',
    role: 'Firmware Project Manager',
    org: 'Penn State Formula SAE Electric, electronics team',
    period: 'Sep 2026 to now',
    summary: 'Telemetry and firmware tooling for the team’s electric race car, including the telemetry page the team reads while the car is running.',
    points: [
      'SD-card CAN logging in Vector BLF format for the car’s ESP32-\u2060C6 telemetry unit, with an allocation-free classifier that flags sessions containing faults or drive data, covered by software-in-the-loop tests that run on the host.',
      'Fixed a use-after-free in the CAN transmit path and out-of-bounds reads in the ESP-\u2060NOW parser that were dropping live telemetry.',
      'One containerized CLI for the STM32 and ESP-\u2060IDF builds (build, lint, DBC code generation, SIL tests, flashing), with CI on the same images.',
      'Every STM32 binary carries a post-link header with its commit, branch, size and CRC, so anyone can check which firmware is on the car.',
    ],
    links: [{ label: 'nittanymotorsports.com', href: 'https://www.nittanymotorsports.com' }],
    field: '#1d4688',
    ink: '#ffffff',
    glow: '#3f8fe0',
    stage: { wide: '1040 / 360', narrow: '300 / 226' },
    shots: [
      {
        file: 'nms-ota',
        widths: [648],
        width: 648,
        height: 399,
        alt: 'The OTA Updates page of the team’s NMS Electronics tool: a picker for a .bin firmware file, buttons to flash the front ECU, the rear ECU or the TCU, and what each one runs, 9f3a21c7 from develop/2026 on the front ECU and the TCU and 4b7e0d12 from isaiah-ots-updates on the rear.',
        wide: { x: 3, y: 54, width: 40, rx: 12, ry: 10, rz: -5 },
        narrow: { x: 0, y: 48, width: 58, rx: 12, ry: 8, rz: -5 },
      },
      {
        file: 'nms-telemetry',
        widths: [800, 1920],
        width: 1920,
        height: 776,
        alt: 'The same tool’s telemetry page reading four signals live: both brake pressure sensors at 0.0 psi and both accelerator pedal sensors near 99 percent, each last heard now, with a graph of each below in which the pedal traces climb from about 70 to 100 percent. A counter at the top reads 17121 frames, 754 a second.',
        wide: { x: 32, y: 4, width: 65, rx: 16, ry: -7, rz: 2 },
        narrow: { x: 10, y: 4, width: 90, rx: 14, ry: -6, rz: 2 },
      },
    ],
  },
  {
    slug: 'gust',
    name: 'Gust',
    role: 'Encrypted peer-to-peer file transfer',
    org: 'C# and .NET',
    period: 'Sep 2026',
    summary: 'Files and clipboard between your own devices, directly, with nothing in the middle. I started it out of frustration that there’s no Continuity between Windows and Apple devices.',
    points: [
      'A transfer protocol with its own mDNS discovery, pinned mutual TLS, code-based pairing using a commitment scheme, and resumable uploads that are hashed while they stream.',
    ],
    links: [{ label: 'Email me to try it', href: 'mailto:himanshu.adwani@outlook.com?subject=Gust' }],
    note: 'A hobby project for now. I plan to open-source it once it’s ready.',
    field: '#1f6b4f',
    ink: '#ffffff',
    glow: '#4fbf94',
    stage: { wide: '1040 / 400', narrow: '300 / 260' },
    shots: [
      {
        file: 'gust-devices',
        widths: [464],
        width: 464,
        height: 711,
        alt: 'Gust’s window in dark mode, on a PC named ISAIAHSDESKTOP that is receiving and visible on its network. Under Devices, 2 paired and 1 nearby, a line runs from its profile picture to Homelab, which is getting one file, 50 percent sent, and a dashed line runs to an iPhone last seen 42 minutes ago; Isaiah’s Surface, between them, is nearby but not paired. A bar along the bottom reads Sending 1 file to Homelab, 6.0 MB of 12.0 MB at 1.9 MB/s.',
        light: {
          file: 'gust-devices-light',
          alt: 'Gust’s window in light mode, on a PC named ISAIAHSDESKTOP that is receiving and visible on its network. Under Devices, 2 paired and 1 nearby, a line runs from its profile picture to Homelab, which is getting one file, 65 percent sent, and a dashed line runs to an iPhone last seen 42 minutes ago; Isaiah’s Surface, between them, is nearby but not paired. A bar along the bottom reads Sending 1 file to Homelab, 7.8 MB of 12.0 MB at 1.9 MB/s.',
        },
        wide: { x: 21, y: 2, width: 27, rx: 4, ry: 20, rz: -2 },
        narrow: { x: 6, y: 2, width: 50, rx: 4, ry: 18, rz: -2 },
      },
      {
        file: 'gust-header',
        widths: [464],
        width: 464,
        height: 145,
        alt: 'Gust in dark mode, folded down to its header: the same PC, visible on this network, with Receiving on.',
        light: {
          file: 'gust-header-light',
          alt: 'Gust in light mode, folded down to its header: the same PC, visible on this network, with Receiving on.',
        },
        wide: { x: 45, y: 70, width: 28, rx: 4, ry: -18, rz: 2 },
        narrow: { x: 50, y: 63, width: 46, rx: 4, ry: -16, rz: 2 },
      },
    ],
  },
  {
    slug: 'airplay-core',
    name: 'airplay-core',
    role: 'AirPlay 2 sender library',
    org: 'Rust',
    period: 'Oct 2026',
    summary: 'An AirPlay 2 sender written in Rust as interoperability research, verified with realtime ALAC playback on Apple TV 4K hardware.',
    points: [
      'HomeKit SRP and Ed25519 pairing, a ChaCha20-\u2060Poly1305 encrypted RTSP channel and a PTP grandmaster clock.',
      'A C ABI with panic-safe FFI boundaries and bindings for .NET and Node, cross-compiled for Windows, Linux and macOS.',
    ],
    links: [],
    note: 'Private. Built from public research on open implementations; not affiliated with Apple.',
    field: '#262b33',
    ink: '#ffffff',
    shots: [],
  },
]

export interface Earlier {
  name: string
  note: string
  year: string
  href: string
  stars?: number
}

export const earlier: Earlier[] = [
  { name: 'Cider, open source', note: 'Contributor to the original open-source Cider, starting with pull request #749.', year: '2022', href: 'https://github.com/ciderapp/Cider/pull/749' },
  { name: 'Kalopsia-Bot', note: 'An open-source Discord bot with moderation tools.', year: '2021', href: 'https://github.com/Monochromish/Kalopsia-Bot', stars: 108 },
  { name: 'Last.fm Discord Rich Presence', note: 'Shows what you are scrobbling on Last.fm as your Discord status.', year: '2022', href: 'https://github.com/Monochromish/Last.fm-Discord-Rich-Presence', stars: 40 },
  { name: 'lastfm-profile-readme', note: 'Puts your current track on your GitHub profile.', year: '2023', href: 'https://github.com/Monochromish/lastfm-profile-readme', stars: 7 },
]
