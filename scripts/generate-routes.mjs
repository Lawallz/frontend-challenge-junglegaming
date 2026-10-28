// Gera src/app/routeTree.gen.ts fora do Vite, para typecheck/build não dependerem do dev server.
import { Generator, getConfig } from '@tanstack/router-generator'

const root = process.cwd()
const config = getConfig({}, root)
await new Generator({ config, root }).run()
