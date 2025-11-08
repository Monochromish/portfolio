import { useState } from '#imports'

// I found these to my liking. They don't stress the CPU too much, and look appealing at the same time
const defaultNoise = 0.45
const defaultTimeFlow = 0.4
const defaultHeight = 30

export function usePerlinSettings() {
    const noiseScale = useState('perlinNoiseScale', () => defaultNoise)
    const timeFlow = useState('perlinTimeFlow', () => defaultTimeFlow)
    const height = useState('perlinHeight', () => defaultHeight)

    const reset = () => {
        noiseScale.value = defaultNoise
        timeFlow.value = defaultTimeFlow
        height.value = defaultHeight
    }

    return { noiseScale, timeFlow, height, reset }
}
