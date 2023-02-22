import fs from 'fs'
import path from 'path'
const pkgJsonPath = path.resolve(__dirname, '../../..', 'package.json')

export const getPkgJSON = () => {
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
  return {
    pkgJson,
  }
}
