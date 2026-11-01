// a letter is 5 dots across and 7 down; lowercase stands on rows 2 to 6 with ascenders from row 0
export const FACE_X = 5
export const FACE_Y = 7

const SHAPES: [string, string][] = [
  ['r', '..... ..... #.##. ##... #.... #.... #....'],
  ['l', '.##.. ..#.. ..#.. ..#.. ..#.. ..#.. .###.'],
  ['c', '..... ..... .###. #.... #.... #.... .###.'],
  ['v', '..... ..... #...# #...# .#.#. .#.#. ..#..'],
  ['f', '..##. .#... ####. .#... .#... .#... .#...'],
  ['n', '..... ..... #.##. ##..# #...# #...# #...#'],
  ['k', '#.... #.... #..#. #.#.. ##... #.#.. #..#.'],
  ['w', '..... ..... #...# #...# #.#.# #.#.# .#.#.'],
  ['z', '..... ..... ##### ...#. ..#.. .#... #####'],
  ['h', '#.... #.... #.##. ##..# #...# #...# #...#'],
  ['m', '..... ..... ##.#. #.#.# #.#.# #.#.# #.#.#'],
  ['b', '#.... #.... ####. #...# #...# #...# ####.'],
  ['d', '....# ....# .#### #...# #...# #...# .####'],
  ['Z', '##### ....# ...#. ..#.. .#... #.... #####'],
  // the eye: a catchlight up and to the left, toward the sun; asleep, a lid
  ['eye', '..... .##.. .##.. ..... ..... ..... .....'],
  ['shut', '..... ..... ..... #...# .###. ..... .....'],
  // the mouth across the head, by the eighth of a turn nearest to it
  ['mouth-', '..... ..... ..... ##### ..... ..... .....'],
  ['mouth\\', '#.... .#... .#... ..#.. ...#. ...#. ....#'],
  ['mouth|', '..#.. ..#.. ..#.. ..#.. ..#.. ..#.. ..#..'],
  ['mouth/', '....# ...#. ...#. ..#.. .#... .#... #....'],
  // a cephalic fin's curl, bulging left, right, up or down
  ['curl<', '...#. ..#.. .#... .#... .#... ..#.. ...#.'],
  ['curl>', '.#... ..#.. ...#. ...#. ...#. ..#.. .#...'],
  ['curl^', '..... ..... .###. #...# ..... ..... .....'],
  ['curlv', '..... ..... ..... #...# .###. ..... .....'],
]

export const GLYPHS = SHAPES.length + 1
export const MASKS = new Uint8Array(GLYPHS * FACE_X * FACE_Y)
SHAPES.forEach(([, rows], g) => {
  const dots = rows.replaceAll(' ', '')
  for (let k = 0; k < FACE_X * FACE_Y; k++) MASKS[(g + 1) * FACE_X * FACE_Y + k] = dots[k] === '#' ? 1 : 0
})
const glyph = (name: string) => SHAPES.findIndex(s => s[0] === name) + 1
const set = (names: string) => Uint8Array.from(names, glyph)

// the skin's letters in three weights, from the least ink to the most
export const WEIGHTS = [set('rlcv'), set('fnkwz'), set('hmbd')]
export const EYE = glyph('eye'), SHUT = glyph('shut')
export const MOUTH = Uint8Array.from(['mouth-', 'mouth\\', 'mouth|', 'mouth/'], glyph)
export const CURL = Uint8Array.from(['curl<', 'curl>', 'curl^', 'curlv'], glyph)
export const DOZE = Uint8Array.from([glyph('z'), glyph('Z'), glyph('Z')])
